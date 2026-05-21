/**
 * Gemini API wrapper.
 * Provides: embedText (with DB cache), chatCompletion (with tool support), incrementUsage.
 *
 * Never logs API keys or raw user content.
 */
const crypto = require('crypto');
const { GoogleGenAI } = require('@google/genai');
const db = require('../config/db');
const logger = require('./logger');

const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
const VECTOR_DIMS = 768;

let _ai = null;
function getClient() {
  if (!_ai) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in server/.env');
    }
    _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _ai;
}

function hashInput(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 64);
}

/**
 * Returns a 768-dim vector for the given text.
 * Checks embedding_cache first; stores result on miss.
 */
async function embedText(text) {
  if (!text || !text.trim()) throw new Error('embedText called with empty input');

  const hash = hashInput(text);

  // Cache lookup
  const cached = await db.query(
    'SELECT embedding FROM embedding_cache WHERE input_hash = $1',
    [hash]
  );
  if (cached.rows.length > 0) {
    return parseVectorFromDb(cached.rows[0].embedding);
  }

  // Call Gemini — gemini-embedding-001 supports Matryoshka truncation,
  // so requesting 768 dims is officially supported and meaningful.
  const ai = getClient();
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: VECTOR_DIMS, taskType: 'SEMANTIC_SIMILARITY' },
  });

  const values = response?.embeddings?.[0]?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Gemini returned no embedding values');
  }
  if (values.length !== VECTOR_DIMS) {
    throw new Error(`Gemini returned ${values.length} dims; expected ${VECTOR_DIMS}`);
  }

  // Store in cache
  const vecLiteral = toVecLiteral(values);
  await db.query(
    `INSERT INTO embedding_cache (input_hash, embedding)
     VALUES ($1, $2)
     ON CONFLICT (input_hash) DO NOTHING`,
    [hash, vecLiteral]
  );

  return values;
}

/**
 * Calls Gemini chat with optional tool definitions.
 * Returns { text, toolCall, usageMetadata }.
 *
 * @param {object} opts
 * @param {Array}  opts.messages - [{role: 'user'|'model', parts: [{text}]}]
 * @param {Array}  [opts.tools]  - Gemini tool definitions array
 */
async function chatCompletion({ messages, tools, modelOverride, systemInstruction }) {
  const ai = getClient();

  const config = {};
  if (tools && tools.length > 0) config.tools = tools;
  if (systemInstruction) config.systemInstruction = systemInstruction;

  const response = await ai.models.generateContent({
    model: modelOverride || CHAT_MODEL,
    contents: messages,
    ...(Object.keys(config).length > 0 ? { config } : {}),
  });

  const candidate = response?.candidates?.[0];
  if (!candidate) throw new Error('Gemini returned no candidates');

  const parts = candidate.content?.parts ?? [];
  const usageMetadata = response?.usageMetadata;

  // Gather any tool calls and text the model produced.
  const toolCalls = parts
    .filter((p) => p.functionCall)
    .map((p) => ({ name: p.functionCall.name, args: p.functionCall.args || {} }));
  const text = parts.map((p) => p.text || '').join('').trim();

  return {
    text,
    toolCall: toolCalls[0] || null,    // back-compat for callers that only want the first
    toolCalls,
    rawContent: candidate.content,     // the orchestrator appends this verbatim to history
    usageMetadata,
  };
}

/**
 * Records token usage in daily_ai_usage table.
 */
async function incrementUsage(tokensUsed = 0) {
  await db.query(
    `INSERT INTO daily_ai_usage (day, request_count, token_count)
     VALUES (CURRENT_DATE, 1, $1)
     ON CONFLICT (day) DO UPDATE
       SET request_count = daily_ai_usage.request_count + 1,
           token_count   = daily_ai_usage.token_count + $1`,
    [tokensUsed]
  );
}

/**
 * Returns { request_count, budget_remaining } for today.
 */
async function getTodayUsage() {
  const budget = parseInt(process.env.AI_DAILY_BUDGET_REQUESTS || '1000', 10);
  const { rows } = await db.query(
    'SELECT request_count, token_count FROM daily_ai_usage WHERE day = CURRENT_DATE'
  );
  const requestCount = rows[0]?.request_count ?? 0;
  return {
    today_requests: requestCount,
    budget_remaining: Math.max(0, budget - requestCount),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toVecLiteral(values) {
  return `[${values.map(v => Number(v).toFixed(8)).join(',')}]`;
}

function parseVectorFromDb(raw) {
  // pgvector returns vector as a string like "[0.1,0.2,...]"
  if (typeof raw === 'string') {
    return raw.replace(/^\[|\]$/g, '').split(',').map(Number);
  }
  if (Array.isArray(raw)) return raw.map(Number);
  return raw;
}

module.exports = { embedText, chatCompletion, incrementUsage, getTodayUsage, hashInput };
