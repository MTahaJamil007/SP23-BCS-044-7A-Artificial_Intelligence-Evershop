/**
 * AI-layer middleware: rate limiting, daily budget guard, request usage logger.
 * All three are mounted on every /api/ai/* route.
 */
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const db = require('../config/db');
const logger = require('../services/logger');

// ─── 1. Rate limiter: 20 requests/min per IP ─────────────────────────────────
const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please wait a moment and try again.' },
});

// ─── 2. Daily budget guard ────────────────────────────────────────────────────
async function aiBudgetGuard(req, res, next) {
  const budget = parseInt(process.env.AI_DAILY_BUDGET_REQUESTS || '1000', 10);
  try {
    const { rows } = await db.query(
      'SELECT request_count FROM daily_ai_usage WHERE day = CURRENT_DATE'
    );
    const count = rows[0]?.request_count ?? 0;
    if (count >= budget) {
      return res.status(503).json({
        error: 'Daily AI request budget exhausted. Search is still available — AI features resume tomorrow.',
        degraded: true,
      });
    }
    next();
  } catch (err) {
    logger.warn({ err: err.message }, 'aiBudgetGuard DB error — allowing request through');
    next();
  }
}

// ─── 3. Usage logger ─────────────────────────────────────────────────────────
// Attaches start time; writes ai_logs row after response finishes.
// Downstream handlers enrich req._aiMeta before sending the response.
function aiUsageLogger(req, res, next) {
  req._aiMeta = {
    startAt: Date.now(),
    inputHash: req.body?.query || req.body?.message || req.body?.question
      ? crypto.createHash('sha256')
          .update(String(req.body.query || req.body.message || req.body.question))
          .digest('hex')
          .slice(0, 64)
      : null,
    retrievedIds: [],
    tokensUsed: 0,
  };

  res.on('finish', async () => {
    const meta = req._aiMeta;
    const latency = Date.now() - meta.startAt;
    const success = res.statusCode < 400;
    // Read user_id and route AT FINISH time — auth middleware has run by now,
    // so vendor routes get the authenticated user id and route gets the full path.
    const userId = req.user?.id ?? null;
    const route = (req.baseUrl || '') + (req.route?.path || req.path || '');
    try {
      await db.query(
        `INSERT INTO ai_logs
           (route, user_id, input_hash, retrieved_ids, latency_ms, tokens_used, success)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          route,
          userId,
          meta.inputHash,
          meta.retrievedIds,
          latency,
          meta.tokensUsed,
          success,
        ]
      );
    } catch (err) {
      logger.warn({ err: err.message }, 'Failed to write ai_logs row');
    }
  });

  next();
}

module.exports = { aiRateLimit, aiBudgetGuard, aiUsageLogger };
