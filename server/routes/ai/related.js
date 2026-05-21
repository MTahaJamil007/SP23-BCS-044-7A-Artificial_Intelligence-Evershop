/**
 * GET /api/ai/related/:product_id
 *
 * Returns up to 6 products most semantically similar to the given product,
 * ranked by cosine distance against the product's stored embedding.
 *
 * Purely deterministic — does not call any LLM, so it's safe under tight quota.
 */
const express = require('express');
const router = express.Router();
const { z } = require('zod');
const db = require('../../config/db');
const { aiRateLimit, aiUsageLogger } = require('../../middleware/ai');
const logger = require('../../services/logger');

const ParamSchema = z.object({ product_id: z.coerce.number().int().positive() });

router.get('/:product_id', aiRateLimit, aiUsageLogger, async (req, res) => {
  const parsed = ParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid product_id' });
  }
  const productId = parsed.data.product_id;

  try {
    const { rows } = await db.query(
      `WITH src AS (
         SELECT embedding FROM product_embeddings WHERE product_id = $1
       )
       SELECT p.id, p.name, p.price, p.category, p.image_url, p.vendor_id,
              COALESCE(vp.store_name, u.name) AS vendor_name,
              1 - (pe.embedding <=> src.embedding) AS similarity
         FROM product_embeddings pe
         CROSS JOIN src
         JOIN products p ON p.id = pe.product_id
         LEFT JOIN users u ON u.id = p.vendor_id
         LEFT JOIN vendor_profiles vp ON vp.user_id = p.vendor_id
        WHERE pe.product_id <> $1
          AND src.embedding IS NOT NULL
          AND pe.embedding IS NOT NULL
        ORDER BY pe.embedding <=> src.embedding
        LIMIT 6`,
      [productId]
    );

    if (req._aiMeta) req._aiMeta.retrievedIds = rows.map(r => r.id);

    return res.json({ ok: true, product_id: productId, related: rows });
  } catch (err) {
    logger.error({ err: err.message }, 'related products failed');
    return res.status(500).json({ error: 'Failed to find related products' });
  }
});

module.exports = router;
