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
async function handleMessage({ sessionId, userId, message }) {
  const session = await loadOrCreateSession(sessionId, userId);

  // Append user message to history
  const history = [...session.messages, { role: 'user', parts: [{ text: message }] }];

  let totalTokens = 0;
  let finalText = '';

  for (let hop = 0; hop < MAX_TOOL_HOPS + 1; hop++) {
    const result = await chatCompletion({
      messages: history,
      tools: TOOL_DECLARATIONS,
      systemInstruction: SYSTEM_PROMPT,
    });
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
      // Append a synthetic note so the model knows to wrap up. (Gemini handles this gracefully.)
      history.push({
        role: 'user',
        parts: [{ text: '(Tool budget reached. Please summarise what you have so far without further tool calls.)' }],
      });
      const finalResult = await chatCompletion({
        messages: history,
        tools: TOOL_DECLARATIONS,
        systemInstruction: SYSTEM_PROMPT,
      });
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
  };
}

module.exports = { handleMessage };
