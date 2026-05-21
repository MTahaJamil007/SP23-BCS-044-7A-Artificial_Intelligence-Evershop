/**
 * Vendor analytics router.
 *
 * Strategy:
 *  1. Try LLM tool-selection. If it returns a function_call, run that tool.
 *  2. If LLM is rate-limited or fails, fall back to KEYWORD ROUTING — a regex
 *     match against the question that picks the closest tool. Keeps the
 *     feature working when Gemini's free-tier daily quota is exhausted.
 *  3. Build a deterministic one-sentence summary from the result data
 *     (no second LLM call — saves half the API quota per question).
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

// ─── Keyword fallback ───────────────────────────────────────────────────────
// Triggered when the LLM is unavailable (429) or fails. Matches the question
// against simple patterns and picks a tool + reasonable default args.
function keywordRoute(question) {
  const q = question.toLowerCase();

  // timeframe
  let timeframe = '30d';
  if (/\b(7|seven)\s*(day|d)\b|\bthis week\b|\bpast week\b/.test(q)) timeframe = '7d';
  else if (/\b(90|ninety)\s*(day|d)\b|\bquarter\b|\bthree months\b/.test(q)) timeframe = '90d';

  // threshold for low-stock — extract first so we can scrub it from the
  // query before looking for price numbers (avoids "stock under 100" being
  // double-counted as max_price = 100).
  let threshold = 10;
  let stripped = q;
  const tMatch = q.match(/(?:stock|inventory)\s*(?:below|under|less than|<=?|<|fewer than)\s*(\d+)/);
  if (tMatch) {
    threshold = parseInt(tMatch[1], 10);
    stripped = q.replace(tMatch[0], '');
  }

  // min_price / max_price — only matched against the scrubbed query, and
  // prefer matches with an explicit "$" sign or a "price" / "cheaper" cue.
  let minPrice = null;
  let maxPrice = null;
  const overMatch = stripped.match(/(?:over|above|more than|>=?|>)\s*\$\s*(\d+(?:\.\d+)?)|(?:price)\s*(?:over|above|>=?|>)\s*\$?\s*(\d+(?:\.\d+)?)/);
  if (overMatch) minPrice = parseFloat(overMatch[1] || overMatch[2]);
  const underMatch = stripped.match(/(?:under|below|less than|<=?|<|cheaper than)\s*\$\s*(\d+(?:\.\d+)?)|(?:price)\s*(?:under|below|<=?|<)\s*\$?\s*(\d+(?:\.\d+)?)/);
  if (underMatch) maxPrice = parseFloat(underMatch[1] || underMatch[2]);

  // limit for top sellers
  let limit = 10;
  const limitMatch = q.match(/\btop\s*(\d{1,2})\b/);
  if (limitMatch) limit = Math.min(50, Math.max(1, parseInt(limitMatch[1], 10)));

  if (/never\s*(sold|been sold|purchased)|unsold|no\s*sales/.test(q)) {
    return { name: 'getProductsNeverSold', args: {} };
  }
  // "stock under N" / "less than N in stock" / "low stock" all map to the low-stock tool.
  if (/low\s*stock|running\s*out|out\s*of\s*stock|nearly\s*out|inventory.*low|(?:stock|inventory)\s*(?:below|under|less than|<)/.test(q)) {
    return {
      name: 'getLowStockItems',
      args: {
        threshold,
        ...(minPrice != null ? { min_price: minPrice } : {}),
        ...(maxPrice != null ? { max_price: maxPrice } : {}),
      },
    };
  }
  if (/top\s*sell|best\s*sell|most\s*sold|popular/.test(q)) {
    return { name: 'getTopSellingProducts', args: { timeframe, limit } };
  }
  if (/revenue.*categor|categor.*revenue|sales by categor/.test(q)) {
    return { name: 'getRevenueByCategory', args: { timeframe } };
  }
  if (/trend|over time|daily|by\s*day|chart/.test(q)) {
    return { name: 'getOrderTrends', args: { timeframe } };
  }
  return null;
}

// ─── Deterministic summariser ───────────────────────────────────────────────
// Builds a one-sentence takeaway from the tool result without burning quota.
function summarise(toolName, args, data) {
  const n = data?.count ?? data?.rows?.length ?? 0;
  if (n === 0) return 'No matching results found for these criteria.';

  switch (toolName) {
    case 'getLowStockItems': {
      const t = args.threshold;
      const parts = [];
      if (args.min_price != null) parts.push(`at least $${args.min_price}`);
      if (args.max_price != null) parts.push(`at most $${args.max_price}`);
      const p = parts.length ? `, priced ${parts.join(' and ')}` : '';
      return `Found ${n} product${n === 1 ? '' : 's'} with stock at or below ${t}${p}.`;
    }
    case 'getTopSellingProducts': {
      const top = data.rows[0];
      return `Top seller over the last ${args.timeframe} is "${top.name}" with ${top.units_sold} units sold (revenue $${top.revenue}).`;
    }
    case 'getRevenueByCategory': {
      const top = data.rows[0];
      return `Best-performing category over ${args.timeframe} is "${top.category}" with $${top.revenue} in revenue.`;
    }
    case 'getOrderTrends': {
      const total = data.rows.reduce((s, r) => s + Number(r.revenue || 0), 0);
      return `Across the last ${args.timeframe} you had orders on ${n} day${n === 1 ? '' : 's'}, totalling $${total.toFixed(2)}.`;
    }
    case 'getProductsNeverSold':
      return `You have ${n} product${n === 1 ? '' : 's'} that have never appeared in any order.`;
    default:
      return `${n} row${n === 1 ? '' : 's'} returned.`;
  }
}

// ─── Main entrypoint ────────────────────────────────────────────────────────
async function routeQuestion(question, { vendor_id }) {
  if (!question || !question.trim()) {
    return { ok: false, error: 'Empty question', message: SUPPORTED_HELP };
  }

  let toolName = null;
  let rawArgs = null;
  let llmUsed = false;
  let llmText = null;

  // ─── Step 1: try LLM tool selection ──────────────────────────────────────
  try {
    const result = await chatCompletion({
      messages: [{ role: 'user', parts: [{ text: question }] }],
      tools: TOOL_DECLARATIONS,
      systemInstruction: ROUTER_PROMPT,
    });
    llmUsed = true;
    if (result.toolCall) {
      toolName = result.toolCall.name;
      rawArgs = result.toolCall.args || {};
    } else if (result.text) {
      llmText = result.text;
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'analytics router LLM call failed — falling back to keyword routing');
  }

  // ─── Step 2: keyword fallback when LLM didn't pick a tool ────────────────
  if (!toolName) {
    const keywordPick = keywordRoute(question);
    if (keywordPick) {
      toolName = keywordPick.name;
      rawArgs = keywordPick.args;
    }
  }

  // ─── Step 3: still no tool — return a clear help message ─────────────────
  if (!toolName) {
    return {
      ok: true,
      tool: null,
      data: null,
      summary: llmText || SUPPORTED_HELP,
      llm_used: llmUsed,
      degraded: !llmUsed,
    };
  }

  // ─── Step 4: validate args ───────────────────────────────────────────────
  const tool = TOOLS[toolName];
  const parsed = tool.paramsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    logger.warn({ tool: toolName, issues: parsed.error.issues }, 'analytics args validation failed');
    return {
      ok: false,
      tool: toolName,
      error: 'Invalid arguments',
      message: parsed.error.issues.map((i) => i.message).join('; '),
    };
  }

  // ─── Step 5: execute the hand-written SQL ────────────────────────────────
  let data;
  try {
    data = await tool.run(parsed.data, { vendor_id });
  } catch (err) {
    logger.error({ tool: toolName, err: err.message }, 'analytics tool execution failed');
    return { ok: false, tool: toolName, error: 'Query failed', message: 'Something went wrong running the analytics query.' };
  }

  // ─── Step 6: deterministic summary (no second LLM call) ──────────────────
  const summary = summarise(toolName, parsed.data, data);

  return {
    ok: true,
    tool: toolName,
    args: parsed.data,
    data,
    summary,
    llm_used: llmUsed,
    degraded: !llmUsed,
  };
}

module.exports = { routeQuestion };
