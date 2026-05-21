/**
 * Vendor analytics tools — server-controlled SQL, parameterised by vendor_id.
 *
 * SECURITY: vendor_id is injected from req.user.id by the route handler.
 * The LLM never sees the SQL and never controls vendor_id. Other parameters
 * (threshold, timeframe) are validated by zod against tight schemas, so an
 * attempted prompt injection like {"timeframe":"all'; DROP TABLE products--"}
 * is rejected before any query runs.
 */
const { z } = require('zod');
const db = require('../../config/db');

const TimeframeSchema = z.enum(['7d', '30d', '90d']);
const TIMEFRAME_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

// ─── Tool: getLowStockItems ─────────────────────────────────────────────────
const getLowStockItems = {
  declaration: {
    name: 'getLowStockItems',
    description: "Find the vendor's products with low or zero stock. Optionally filter by minimum price.",
    parameters: {
      type: 'object',
      properties: {
        threshold: { type: 'integer', description: 'Maximum stock_quantity to include (e.g. 10 for "low stock")' },
        min_price: { type: 'number', description: 'Only include products priced at or above this amount' },
      },
      required: ['threshold'],
    },
  },
  paramsSchema: z.object({
    threshold: z.number().int().min(0).max(10000),
    min_price: z.number().min(0).max(1e6).nullable().optional(),
  }),
  async run({ threshold, min_price = null }, { vendor_id }) {
    const { rows } = await db.query(
      `SELECT id, name, category, price, stock_quantity
         FROM products
        WHERE vendor_id = $1
          AND stock_quantity <= $2
          AND ($3::numeric IS NULL OR price >= $3)
        ORDER BY stock_quantity ASC, price DESC
        LIMIT 25`,
      [vendor_id, threshold, min_price]
    );
    return { count: rows.length, rows };
  },
};

// ─── Tool: getTopSellingProducts ────────────────────────────────────────────
const getTopSellingProducts = {
  declaration: {
    name: 'getTopSellingProducts',
    description: "Top-selling products for the vendor in a given timeframe, by units sold and revenue.",
    parameters: {
      type: 'object',
      properties: {
        timeframe: { type: 'string', enum: ['7d', '30d', '90d'] },
        limit: { type: 'integer', description: 'Max rows to return (default 10)' },
      },
      required: ['timeframe'],
    },
  },
  paramsSchema: z.object({
    timeframe: TimeframeSchema,
    limit: z.number().int().min(1).max(50).default(10),
  }),
  async run({ timeframe, limit }, { vendor_id }) {
    const days = TIMEFRAME_DAYS[timeframe];
    const { rows } = await db.query(
      `SELECT p.id, p.name, p.category,
              SUM(oi.quantity) AS units_sold,
              ROUND(SUM(oi.quantity * oi.price_at_purchase)::numeric, 2) AS revenue
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
        WHERE oi.vendor_id = $1
          AND oi.created_at >= now() - ($2 || ' days')::interval
        GROUP BY p.id, p.name, p.category
        ORDER BY units_sold DESC
        LIMIT $3`,
      [vendor_id, String(days), limit]
    );
    return { count: rows.length, timeframe, rows };
  },
};

// ─── Tool: getRevenueByCategory ─────────────────────────────────────────────
const getRevenueByCategory = {
  declaration: {
    name: 'getRevenueByCategory',
    description: "Vendor revenue broken down by product category over a timeframe.",
    parameters: {
      type: 'object',
      properties: { timeframe: { type: 'string', enum: ['7d', '30d', '90d'] } },
      required: ['timeframe'],
    },
  },
  paramsSchema: z.object({ timeframe: TimeframeSchema }),
  async run({ timeframe }, { vendor_id }) {
    const days = TIMEFRAME_DAYS[timeframe];
    const { rows } = await db.query(
      `SELECT COALESCE(p.category, 'uncategorised') AS category,
              SUM(oi.quantity) AS units_sold,
              ROUND(SUM(oi.quantity * oi.price_at_purchase)::numeric, 2) AS revenue
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
        WHERE oi.vendor_id = $1
          AND oi.created_at >= now() - ($2 || ' days')::interval
        GROUP BY p.category
        ORDER BY revenue DESC NULLS LAST`,
      [vendor_id, String(days)]
    );
    return { count: rows.length, timeframe, rows };
  },
};

// ─── Tool: getOrderTrends ───────────────────────────────────────────────────
const getOrderTrends = {
  declaration: {
    name: 'getOrderTrends',
    description: "Daily order counts and revenue trend for the vendor over a timeframe.",
    parameters: {
      type: 'object',
      properties: { timeframe: { type: 'string', enum: ['7d', '30d', '90d'] } },
      required: ['timeframe'],
    },
  },
  paramsSchema: z.object({ timeframe: TimeframeSchema }),
  async run({ timeframe }, { vendor_id }) {
    const days = TIMEFRAME_DAYS[timeframe];
    const { rows } = await db.query(
      `SELECT DATE(oi.created_at) AS day,
              COUNT(DISTINCT oi.order_id) AS orders,
              SUM(oi.quantity) AS units,
              ROUND(SUM(oi.quantity * oi.price_at_purchase)::numeric, 2) AS revenue
         FROM order_items oi
        WHERE oi.vendor_id = $1
          AND oi.created_at >= now() - ($2 || ' days')::interval
        GROUP BY DATE(oi.created_at)
        ORDER BY day DESC`,
      [vendor_id, String(days)]
    );
    return { count: rows.length, timeframe, rows };
  },
};

// ─── Tool: getProductsNeverSold ─────────────────────────────────────────────
const getProductsNeverSold = {
  declaration: {
    name: 'getProductsNeverSold',
    description: "Vendor products that have never appeared in any order.",
    parameters: { type: 'object', properties: {} },
  },
  paramsSchema: z.object({}).strict(),
  async run(_args, { vendor_id }) {
    const { rows } = await db.query(
      `SELECT p.id, p.name, p.category, p.price, p.stock_quantity, p.created_at
         FROM products p
        WHERE p.vendor_id = $1
          AND NOT EXISTS (
            SELECT 1 FROM order_items oi WHERE oi.product_id = p.id
          )
        ORDER BY p.created_at DESC
        LIMIT 25`,
      [vendor_id]
    );
    return { count: rows.length, rows };
  },
};

const TOOLS = {
  getLowStockItems,
  getTopSellingProducts,
  getRevenueByCategory,
  getOrderTrends,
  getProductsNeverSold,
};

const TOOL_DECLARATIONS = [
  { functionDeclarations: Object.values(TOOLS).map((t) => t.declaration) },
];

const SUPPORTED_HELP =
  'I can answer questions about: low-stock items, top-selling products, revenue by category, order trends, and products that have never sold. Try: "Show me my low stock items under $50" or "Top sellers in the last 30 days".';

module.exports = { TOOLS, TOOL_DECLARATIONS, SUPPORTED_HELP };
