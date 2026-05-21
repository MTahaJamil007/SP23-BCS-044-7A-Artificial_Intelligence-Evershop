const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { handleMessage } = require('../../services/chat/orchestrator');
const { aiRateLimit, aiBudgetGuard, aiUsageLogger } = require('../../middleware/ai');
const { incrementUsage } = require('../../services/gemini');
const logger = require('../../services/logger');

const BodySchema = z.object({
  session_id: z.string().uuid().nullable().optional(),
  message: z.string().min(1).max(2000),
});

// Soft auth — JWT optional. If present, we record user_id with the session.
function softAuth(req) {
  try {
    const header = req.header('Authorization');
    if (!header) return null;
    const token = header.split(' ')[1];
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123');
    return decoded?.id ?? null;
  } catch {
    return null;
  }
}

router.post('/', aiRateLimit, aiBudgetGuard, aiUsageLogger, async (req, res) => {
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', issues: parsed.error.issues });
  }

  const userId = softAuth(req);
  const { session_id, message } = parsed.data;

  try {
    const result = await handleMessage({
      sessionId: session_id || null,
      userId,
      message,
    });

    // Record token usage against the daily budget
    if (result.tokens_used) {
      await incrementUsage(result.tokens_used);
    } else {
      await incrementUsage(0);
    }

    if (req._aiMeta) {
      req._aiMeta.retrievedIds = result.sources;
      req._aiMeta.tokensUsed = result.tokens_used;
    }

    return res.json({
      ok: true,
      reply: result.reply,
      sources: result.sources,
      session_id: result.session_id,
    });
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'chat orchestrator failed');
    // Surface common Gemini quota error in a user-friendly way
    if (err.message && err.message.includes('RESOURCE_EXHAUSTED')) {
      return res.status(503).json({
        error: 'AI assistant is rate-limited right now. Please try again in a minute.',
        degraded: true,
      });
    }
    return res.status(500).json({ error: 'Chat request failed' });
  }
});

module.exports = router;
