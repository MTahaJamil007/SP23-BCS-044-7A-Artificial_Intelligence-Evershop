const express = require('express');
const router = express.Router();
const { getTodayUsage } = require('../../services/gemini');
const { aiRateLimit, aiBudgetGuard, aiUsageLogger } = require('../../middleware/ai');

router.get('/', aiRateLimit, aiUsageLogger, async (req, res) => {
  try {
    const usage = await getTodayUsage();
    return res.json({ ok: true, ...usage });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
