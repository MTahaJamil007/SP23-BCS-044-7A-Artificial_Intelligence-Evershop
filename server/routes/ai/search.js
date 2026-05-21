const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { hybridSearch } = require('../../services/hybridSearch');
const { aiRateLimit, aiBudgetGuard, aiUsageLogger } = require('../../middleware/ai');
const logger = require('../../services/logger');

const BodySchema = z.object({
  query: z.string().min(1).max(500),
});

router.post('/', aiRateLimit, aiBudgetGuard, aiUsageLogger, async (req, res) => {
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', issues: parsed.error.issues });
  }

  try {
    const { filters, results, debug } = await hybridSearch(parsed.data.query);

    if (req._aiMeta) {
      req._aiMeta.retrievedIds = results.map(r => r.id);
    }

    if (results.length === 0) {
      return res.json({
        ok: true,
        message: "No products matched your search.",
        filters,
        results: [],
        debug,
      });
    }

    return res.json({ ok: true, filters, results, debug });
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'hybrid search failed');
    return res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
