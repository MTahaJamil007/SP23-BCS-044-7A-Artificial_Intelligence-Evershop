/**
 * Chat orchestrator — manages a tool-calling conversation with Gemini.
 *
 * Responsibilities:
 *  - Load/create session row from chat_sessions
 *  - Send full conversation history + tool declarations to Gemini
 *  - When the model returns a function_call: validate args, run tool, append result, loop
 *  - Cap at MAX_TOOL_HOPS hops per user message to prevent runaway
 *  - Persist updated history back to the session
 *  - Extract [product:ID] citation tokens from the final reply for the frontend
 */
const db = require('../../config/db');
const { chatCompletion } = require('../gemini');
const logger = require('../logger');
const { TOOLS, TOOL_DECLARATIONS } = require('./tools');
const { SYSTEM_PROMPT } = require('./systemPrompt');

const MAX_TOOL_HOPS = 3;
const SESSION_IDLE_MINUTES = 30;
const PRODUCT_TOKEN = /\[product:(\d+)\]/g;

const POLICY_TOPICS = {
  returns: /\breturn|refund|exchange|send back\b/i,
  shipping: /\bship|delivery|deliver|arrive|how long\b/i,
  warranty: /\bwarrant|guarantee|broken|defective\b/i,
  payment: /\bpay|payment|credit card|visa|mastercard|paypal|klarna|crypto\b/i,
  contact: /\bcontact|support|reach|email|customer service\b/i,
};

const PRODUCT_INTENT = /\b(find|show|recommend|suggest|looking for|need a|searching for|search|browse|i want|do you have|got any|under\s*\$?\d+)\b|\b(shoes?|laptop|jacket|shirt|watch|bracelet|monitor|phone|earbud|speaker|sneaker|t-?shirt|backpack|drive|ssd|airpod|echo|macbook)\b/i;

// ─── Session helpers ────────────────────────────────────────────────────────

async function loadOrCreateSession(sessionId, userId = null) {
  if (sessionId) {
    const { rows } = await db.query(
      `SELECT id, messages FROM chat_sessions
        WHERE id = $1 AND expires_at > now()`,
      [sessionId]
    );
    if (rows.length > 0) {
      return { id: rows[0].id, messages: rows[0].messages || [] };
    }
  }
  // Create a new session (DB generates uuid + expires_at)
  const { rows } = await db.query(
    `INSERT INTO chat_sessions (user_id) VALUES ($1)
     RETURNING id, messages`,
    [userId]
  );
  return { id: rows[0].id, messages: [] };
}

async function saveSession(sessionId, messages) {
  await db.query(
    `UPDATE chat_sessions
        SET messages = $1::jsonb,
            updated_at = now(),
            expires_at = now() + interval '${SESSION_IDLE_MINUTES} minutes'
      WHERE id = $2`,
    [JSON.stringify(messages), sessionId]
  );
}

// ─── Tool execution ─────────────────────────────────────────────────────────

async function runTool(name, args) {
  const tool = TOOLS[name];
  if (!tool) {
    return { error: `Unknown tool: ${name}` };
  }
  const parsed = tool.paramsSchema.safeParse(args);
  if (!parsed.success) {
    logger.warn({ tool: name, issues: parsed.error.issues, args }, 'tool args validation failed');
    return { error: `Invalid arguments for ${name}: ${parsed.error.issues.map(i => i.message).join('; ')}` };
  }
  try {
    return await tool.run(parsed.data);
  } catch (err) {
    logger.error({ tool: name, err: err.message }, 'tool execution failed');
    return { error: `Tool ${name} failed: ${err.message}` };
  }
}

// ─── Intent detection (for fallback when LLM is unavailable) ────────────────

function detectIntent(message) {
  if (!message) return { type: 'unknown' };
  // Off-topic refusal patterns
  if (/\b(fibonacci|recipe|joke|weather|news|code|python|javascript|sql|capital of|meaning of life)\b/i.test(message)) {
    return { type: 'offtopic' };
  }
  // Policy intent
  for (const [topic, pattern] of Object.entries(POLICY_TOPICS)) {
    if (pattern.test(message)) return { type: 'policy', topic };
  }
  // Product search intent
  if (PRODUCT_INTENT.test(message)) {
    return { type: 'search', query: message };
  }
  return { type: 'unknown' };
}

// ─── Deterministic fallback handler ─────────────────────────────────────────
// Called when the LLM is rate-limited (429) or otherwise unavailable.
// Handles the most common intents without burning Gemini quota.

async function fallbackHandle({ session, message }) {
  const intent = detectIntent(message);
  let reply;

  if (intent.type === 'policy') {
    const result = await TOOLS.getPolicies.run({ topic: intent.topic });
    reply = `${result.content}\n\n_AI concierge is on quota cooldown — answered from stored policies._`;
  } else if (intent.type === 'search') {
    const result = await TOOLS.searchProducts.run({ query: intent.query });
    if (result.products.length === 0) {
      reply = `I couldn't find any matching products. Try a different search term.\n\n_AI concierge is on quota cooldown — using basic search._`;
    } else {
      const lines = result.products.slice(0, 5).map(
        (p) => `- **${p.name}** — $${p.price.toFixed(2)} [product:${p.id}]`
      );
      reply = `Here's what I found:\n\n${lines.join('\n')}\n\n_AI concierge is on quota cooldown — answered with a direct search instead of a full conversation._`;
    }
  } else if (intent.type === 'offtopic') {
    reply = `I'm just the EverShop shopping assistant — I can help you find products or answer questions about shipping, returns, warranty, payment, or contact info.`;
  } else {
    reply =
      `I'm on quota cooldown so I can't carry a full conversation right now. I can still help with:\n\n` +
      `- Searching for products (try "find me a laptop under $1500")\n` +
      `- Store policies (try "what's your return policy?" / "do you ship internationally?")\n\n` +
      `_Full AI assistant resumes when daily quota resets._`;
  }

  const newHistory = [
    ...session.messages,
    { role: 'user', parts: [{ text: message }] },
    { role: 'model', parts: [{ text: reply }] },
  ];
  await saveSession(session.id, newHistory);

  return {
    reply,
    sources: extractSources(reply),
    session_id: session.id,
    tokens_used: 0,
    degraded: true,
  };
}

// ─── Citation extraction ────────────────────────────────────────────────────

function extractSources(text) {
  const ids = new Set();
  let m;
  while ((m = PRODUCT_TOKEN.exec(text)) !== null) ids.add(parseInt(m[1], 10));
  return [...ids];
}

// ─── Main entrypoint ────────────────────────────────────────────────────────

/**
 * @param {Object} input
 * @param {string|null} input.sessionId
 * @param {number|null} input.userId
 * @param {string} input.message - user's message
 * @returns {Promise<{ reply, sources, session_id, tokens_used }>}
 */
function isQuotaError(err) {
  const m = err?.message || '';
  return m.includes('RESOURCE_EXHAUSTED') || m.includes('"code":429') || m.includes('429');
}

async function handleMessage({ sessionId, userId, message }) {
  const session = await loadOrCreateSession(sessionId, userId);

  // Append user message to history
  const history = [...session.messages, { role: 'user', parts: [{ text: message }] }];

  let totalTokens = 0;
  let finalText = '';

  for (let hop = 0; hop < MAX_TOOL_HOPS + 1; hop++) {
    let result;
    try {
      result = await chatCompletion({
        messages: history,
        tools: TOOL_DECLARATIONS,
        systemInstruction: SYSTEM_PROMPT,
      });
    } catch (err) {
      // Graceful degradation: when Gemini is over quota, route through the
      // deterministic intent handler instead of returning a 503.
      if (isQuotaError(err)) {
        logger.warn({ err: err.message }, 'chat orchestrator: LLM quota exhausted — using deterministic fallback');
        return fallbackHandle({ session, message });
      }
      throw err;
    }
    if (result.usageMetadata?.totalTokenCount) {
      totalTokens += result.usageMetadata.totalTokenCount;
    }

    // Append the model's response verbatim to history
    history.push(result.rawContent || { role: 'model', parts: [{ text: result.text }] });

    if (!result.toolCalls || result.toolCalls.length === 0) {
      // No tool call — model produced its final answer
      finalText = result.text;
      break;
    }

    // We hit the hop cap — let the model finish without more tool calls
    if (hop === MAX_TOOL_HOPS) {
      logger.warn({ sessionId: session.id, hops: hop }, 'chat: max tool-hops reached, forcing termination');
      history.push({
        role: 'user',
        parts: [{ text: '(Tool budget reached. Please summarise what you have so far without further tool calls.)' }],
      });
      let finalResult;
      try {
        finalResult = await chatCompletion({
          messages: history,
          tools: TOOL_DECLARATIONS,
          systemInstruction: SYSTEM_PROMPT,
        });
      } catch (err) {
        if (isQuotaError(err)) return fallbackHandle({ session, message });
        throw err;
      }
      if (finalResult.usageMetadata?.totalTokenCount) totalTokens += finalResult.usageMetadata.totalTokenCount;
      history.push(finalResult.rawContent || { role: 'model', parts: [{ text: finalResult.text }] });
      finalText = finalResult.text;
      break;
    }

    // Execute every tool call the model emitted and append the responses
    const responseParts = [];
    for (const call of result.toolCalls) {
      const toolResult = await runTool(call.name, call.args || {});
      responseParts.push({
        functionResponse: { name: call.name, response: toolResult },
      });
    }
    history.push({ role: 'user', parts: responseParts });
  }

  await saveSession(session.id, history);

  return {
    reply: finalText || "I'm not sure how to help with that. Could you rephrase?",
    sources: extractSources(finalText),
    session_id: session.id,
    tokens_used: totalTokens,
    degraded: false,
  };
}

module.exports = { handleMessage };
