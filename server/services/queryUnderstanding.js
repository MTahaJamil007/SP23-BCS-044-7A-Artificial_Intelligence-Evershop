/**
 * Extracts structured filters from a natural-language search query.
 * Uses Gemini with a strict JSON-only prompt. Validates with zod.
 * On any failure: returns { semantic_query: original } — never throws to the caller.
 */
const crypto = require('crypto');
const { z } = require('zod');
const { chatCompletion } = require('./gemini');
const db = require('../config/db');
const logger = require('./logger');

const QU_MODEL = process.env.GEMINI_QU_MODEL || 'gemini-2.5-flash-lite';

function qhash(q) {
  return crypto.createHash('sha256').update(q.toLowerCase().trim()).digest('hex').slice(0, 64);
}

const FilterSchema = z.object({
  price_min: z.number().nullable().optional(),
  price_max: z.number().nullable().optional(),
  category: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  semantic_query: z.string().min(1),
});

const SYSTEM_PROMPT = `You parse e-commerce search queries into structured JSON.

Available categories in this store (exact strings, lowercase):
- men's clothing
- women's clothing
- jewelery
- electronics
- laptops
- mens-shirts
- mens-shoes
- mens-watches
- mobile-accessories

Output ONLY valid JSON. No markdown, no commentary. Schema:
{
  "price_min": number | null,    // dollars, e.g. 50
  "price_max": number | null,    // dollars
  "category":  string  | null,   // one of the categories above, or null
  "brand":     string  | null,   // e.g. "Nike", "Apple", "Rolex"
  "color":     string  | null,
  "semantic_query": string       // the user's intent stripped of filters
}

Examples:
Q: "red Nike shoes under $80"
A: {"price_min":null,"price_max":80,"category":"mens-shoes","brand":"Nike","color":"red","semantic_query":"shoes"}

Q: "iPhone 15"
A: {"price_min":null,"price_max":null,"category":null,"brand":"Apple","color":null,"semantic_query":"iPhone 15"}

Q: "cheap t-shirts"
A: {"price_min":null,"price_max":30,"category":null,"brand":null,"color":null,"semantic_query":"t-shirts"}

Q: "luxury watch"
A: {"price_min":1000,"price_max":null,"category":"mens-watches","brand":null,"color":null,"semantic_query":"luxury watch"}`;

function fallback(query) {
  return {
    price_min: null,
    price_max: null,
    category: null,
    brand: null,
    color: null,
    semantic_query: query,
  };
}

function extractJson(text) {
  if (!text) return null;
  // Strip code fences if the model wrapped output
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find a JSON object inside the text
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch { return null; }
  }
}

async function parseQuery(query) {
  if (!query || !query.trim()) return fallback('');

  const hash = qhash(query);

  // Cache lookup
  try {
    const { rows } = await db.query(
      'SELECT filters FROM query_understanding_cache WHERE query_hash = $1',
      [hash]
    );
    if (rows.length > 0) {
      return rows[0].filters;
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'queryUnderstanding cache lookup failed');
  }

  try {
    const { text } = await chatCompletion({
      messages: [
        { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nQ: "${query}"\nA:` }] },
      ],
      modelOverride: QU_MODEL,
    });

    const parsed = extractJson(text);
    if (!parsed) {
      logger.warn({ query, raw: text?.slice(0, 200) }, 'queryUnderstanding: could not parse JSON');
      return fallback(query);
    }

    const result = FilterSchema.safeParse(parsed);
    if (!result.success) {
      logger.warn({ query, errors: result.error.issues }, 'queryUnderstanding: zod validation failed');
      return fallback(query);
    }

    // Normalise empty strings to null
    const data = result.data;
    for (const k of ['category', 'brand', 'color']) {
      if (data[k] === '') data[k] = null;
    }

    // Persist to cache
    try {
      await db.query(
        `INSERT INTO query_understanding_cache (query_hash, query_text, filters)
         VALUES ($1, $2, $3) ON CONFLICT (query_hash) DO NOTHING`,
        [hash, query, data]
      );
    } catch (err) {
      logger.warn({ err: err.message }, 'queryUnderstanding cache write failed');
    }

    return data;
  } catch (err) {
    logger.warn({ query, err: err.message }, 'queryUnderstanding: LLM call failed');
    return fallback(query);
  }
}

module.exports = { parseQuery, fallback };
