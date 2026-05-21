/**
 * Tools the shopping assistant can call.
 *
 * Each tool exports:
 *   - `declaration` — Gemini functionDeclaration (sent to the model)
 *   - `paramsSchema` — zod schema for validating LLM-supplied args
 *   - `run(args, ctx)` — actual implementation. `ctx` carries request-scoped state.
 *
 * All run() return JSON-serializable objects suitable to feed back to Gemini
 * as functionResponse.parts content. They never throw — errors come back as
 * { error: '...' } so the model can reason about failure.
 */
const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const db = require('../../config/db');
const { hybridSearch } = require('../hybridSearch');

const POLICIES = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'content', 'policies.json'), 'utf8')
);
const POLICY_TOPICS = Object.keys(POLICIES);

// ─── Tool: searchProducts ───────────────────────────────────────────────────
const searchProducts = {
  declaration: {
    name: 'searchProducts',
    description:
      'Search the EverShop catalog using natural language. Use this when the user asks for product recommendations, comparisons, or anything that requires browsing inventory. Returns up to 8 ranked products with id, name, price, category, stock, and vendor.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Natural language query (e.g. "waterproof winter jacket under $100", "Apple laptop with great battery"). Pass user intent verbatim — internal pipeline handles filter extraction.',
        },
      },
      required: ['query'],
    },
  },
  paramsSchema: z.object({ query: z.string().min(1).max(500) }),
  async run({ query }) {
    const { results, filters } = await hybridSearch(query);
    const trimmed = results.slice(0, 8).map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      category: p.category,
      stock_quantity: p.stock_quantity,
      vendor: p.vendor_name,
      // Only first 200 chars of description — the LLM does not need the full text.
      summary: (p.description || '').slice(0, 200),
    }));
    return { count: trimmed.length, filters, products: trimmed };
  },
};

// ─── Tool: getProductDetails ────────────────────────────────────────────────
const getProductDetails = {
  declaration: {
    name: 'getProductDetails',
    description:
      'Fetch the latest details for a single product by id, including live stock. Use this when the user asks follow-up questions about a specific item the assistant has previously surfaced.',
    parameters: {
      type: 'object',
      properties: {
        product_id: { type: 'integer', description: 'The numeric product id' },
      },
      required: ['product_id'],
    },
  },
  paramsSchema: z.object({ product_id: z.number().int().positive() }),
  async run({ product_id }) {
    const { rows } = await db.query(
      `SELECT p.id, p.name, p.description, p.price, p.category, p.stock_quantity,
              p.image_url, p.vendor_id,
              COALESCE(vp.store_name, u.name) AS vendor_name
         FROM products p
         LEFT JOIN users u ON u.id = p.vendor_id
         LEFT JOIN vendor_profiles vp ON vp.user_id = p.vendor_id
         WHERE p.id = $1`,
      [product_id]
    );
    if (rows.length === 0) {
      return { error: `Product ${product_id} not found in catalog.` };
    }
    const p = rows[0];
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      category: p.category,
      stock_quantity: p.stock_quantity,
      in_stock: p.stock_quantity > 0,
      vendor: p.vendor_name,
    };
  },
};

// ─── Tool: getPolicies ──────────────────────────────────────────────────────
const getPolicies = {
  declaration: {
    name: 'getPolicies',
    description:
      `Look up EverShop's store policy on a given topic. Use this whenever the user asks about shipping, returns, warranty, payment methods, or contact info.`,
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          enum: POLICY_TOPICS,
          description: `One of: ${POLICY_TOPICS.join(', ')}`,
        },
      },
      required: ['topic'],
    },
  },
  paramsSchema: z.object({ topic: z.enum(POLICY_TOPICS) }),
  async run({ topic }) {
    return { topic, content: POLICIES[topic] };
  },
};

// ─── Registry ────────────────────────────────────────────────────────────────
const TOOLS = { searchProducts, getProductDetails, getPolicies };

// Gemini expects all functionDeclarations bundled under a single `tools` array entry.
const TOOL_DECLARATIONS = [
  { functionDeclarations: Object.values(TOOLS).map((t) => t.declaration) },
];

module.exports = { TOOLS, TOOL_DECLARATIONS };
