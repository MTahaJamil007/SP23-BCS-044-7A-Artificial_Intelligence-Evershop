/**
 * Vendor analytics router.
 *
 * Single-shot LLM call:
 *   1. Send question + tool declarations
 *   2. Get back ONE function_call from the model
 *   3. Validate args with zod
 *   4. Execute the corresponding hand-written SQL function
 *   5. Generate a one-sentence summary from the data (optional second LLM call)
 *
 * The LLM never writes SQL, never sees vendor_id, never controls vendor_id.
 */
const { chatCompletion } = require('../gemini');
const logger = require('../logger');
const { TOOLS, TOOL_DECLARATIONS, SUPPORTED_HELP } = require('./tools');

const ROUTER_PROMPT = `You are an analytics dispatcher for vendor-side EverShop dashboards.

Given a vendor's question, select EXACTLY ONE of the available tools and call it with appropriate parameters. Do not chain tool calls. Do not output free-form text other than the function call.

Rules:
- If the question doesn't clearly match one of the supported tools, do NOT call any tool — respond with plain text saying "I can't answer that. Try asking about: low stock, top sellers, revenue by category, order trends, or products never sold."
- If the question is destructive ("delete my products", "remove all orders"), refuse — say "I only provide read-only analytics."
- Default timeframe to "30d" when the user didn't specify one.
- Default low-stock threshold to 10 when the user didn't specify one.`;

async function routeQuestion(question, { vendor_id }) {
  if (!question || !question.trim()) {
    return { ok: false, error: 'Empty question', message: SUPPORTED_HELP };
  }

  // ─── Step 1: ask the LLM which tool to call ───────────────────────────────
  let result;
  try {
    result = await chatCompletion({
      messages: [{ role: 'user', parts: [{ text: question }] }],
      tools: TOOL_DECLARATIONS,
      systemInstruction: ROUTER_PROMPT,
    });
  } catch (err) {
    logger.warn({ err: err.message }, 'analytics router LLM call failed');
    return { ok: false, error: 'LLM unavailable', message: 'AI analytics is briefly unavailable. Please try again.' };
  }

  // No tool call → model refused or said "I can't answer"
  if (!result.toolCall) {
    return {
      ok: true,
      tool: null,
      data: null,
      summary: result.text || SUPPORTED_HELP,
    };
  }

  const { name, args } = result.toolCall;
  const tool = TOOLS[name];
  if (!tool) {
    return { ok: false, error: `Unknown tool: ${name}`, message: SUPPORTED_HELP };
  }

  // ─── Step 2: validate args ────────────────────────────────────────────────
  const parsed = tool.paramsSchema.safeParse(args || {});
  if (!parsed.success) {
    logger.warn({ tool: name, issues: parsed.error.issues }, 'analytics args validation failed');
    return {
      ok: false,
      tool: name,
      error: 'Invalid arguments',
      message: parsed.error.issues.map((i) => i.message).join('; '),
    };
  }

  // ─── Step 3: execute the hand-written SQL ────────────────────────────────
  let data;
  try {
    data = await tool.run(parsed.data, { vendor_id });
  } catch (err) {
    logger.error({ tool: name, err: err.message }, 'analytics tool execution failed');
    return { ok: false, tool: name, error: 'Query failed', message: 'Something went wrong running the analytics query.' };
  }

  // ─── Step 4: optional summary sentence ────────────────────────────────────
  let summary = '';
  try {
    const sumResult = await chatCompletion({
      messages: [
        {
          role: 'user',
          parts: [
            {
              text:
`The vendor asked: "${question}"
The tool "${name}" returned this JSON:
${JSON.stringify(data).slice(0, 1500)}

Write ONE short sentence (max 25 words) summarising the key takeaway. Plain prose only, no markdown.`,
            },
          ],
        },
      ],
      systemInstruction: 'You are a concise data summariser. Output exactly one sentence.',
    });
    summary = (sumResult.text || '').trim();
  } catch (err) {
    // Summary is best-effort. If it fails, return raw data without a summary.
    logger.warn({ err: err.message }, 'analytics summary generation failed');
  }

  return {
    ok: true,
    tool: name,
    args: parsed.data,
    data,
    summary,
  };
}

module.exports = { routeQuestion };
