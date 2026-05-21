const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { verifyToken, isVendor } = require('../../middleware/roles');
const { aiRateLimit, aiBudgetGuard, aiUsageLogger } = require('../../middleware/ai');
const { routeQuestion } = require('../../services/analytics/router');
const { incrementUsage } = require('../../services/gemini');
const logger = require('../../services/logger');

const BodySchema = z.object({ question: z.string().min(1).max(500) });

router.post(
  '/',
  aiRateLimit,
  aiBudgetGuard,
  aiUsageLogger,
  verifyToken,
  isVendor,
  async (req, res) => {
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', issues: parsed.error.issues });
    }

    // CRITICAL: vendor_id comes ONLY from the JWT, never from request body or LLM.
    const vendorId = req.user.id;

    try {
      const result = await routeQuestion(parsed.data.question, { vendor_id: vendorId });

      // Best-effort token usage accounting
      await incrementUsage(0);

      return res.json(result);
    } catch (err) {
      logger.error({ err: err.message }, 'vendor analytics failed');
      if (err.message?.includes('RESOURCE_EXHAUSTED')) {
        return res.status(503).json({ error: 'AI is rate-limited right now', degraded: true });
      }
      return res.status(500).json({ error: 'Analytics request failed' });
    }
  }
);

module.exports = router;
