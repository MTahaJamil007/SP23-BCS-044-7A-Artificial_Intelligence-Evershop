/**
 * POST /api/ai/vendor/generate-description
 *
 * Generates a 60-100 word product description from structured inputs.
 * Vendor-only. Output is plain prose — no markdown, no marketing fluff.
 */
const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { verifyToken, isVendor } = require('../../middleware/roles');
const { aiRateLimit, aiBudgetGuard, aiUsageLogger } = require('../../middleware/ai');
const { chatCompletion, incrementUsage } = require('../../services/gemini');
const logger = require('../../services/logger');

const BodySchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  key_features: z.array(z.string().min(1).max(200)).min(1).max(10),
  brand: z.string().max(100).optional(),
  target_audience: z.string().max(200).optional(),
});

const SYSTEM_PROMPT = `You write concise, factual product descriptions for an e-commerce catalog.

Rules:
- 60 to 100 words. Plain prose. No markdown, no bullet lists, no emojis.
- Mention every key feature provided by the vendor at least once.
- Do not invent specs, materials, or claims the vendor didn't give you.
- Speak to the customer, not the seller. Avoid corporate buzzwords ("synergy", "world-class", "best-in-class").
- Don't quote the product name back too many times — once or twice max.
- Output the description text only — no greeting, no preamble, no closing.`;

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
    const { name, category, key_features, brand, target_audience } = parsed.data;

    const userPrompt =
      `Product: ${name}\n` +
      `Category: ${category}\n` +
      (brand ? `Brand: ${brand}\n` : '') +
      (target_audience ? `Audience: ${target_audience}\n` : '') +
      `Key features:\n${key_features.map((f, i) => `  ${i + 1}. ${f}`).join('\n')}\n\n` +
      `Write the description.`;

    try {
      const result = await chatCompletion({
        messages: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: SYSTEM_PROMPT,
      });
      if (result.usageMetadata?.totalTokenCount) {
        await incrementUsage(result.usageMetadata.totalTokenCount);
      }
      if (req._aiMeta) req._aiMeta.tokensUsed = result.usageMetadata?.totalTokenCount ?? 0;

      const description = (result.text || '').trim();
      if (!description) {
        return res.status(502).json({ error: 'AI returned an empty description. Please try again.' });
      }
      return res.json({ ok: true, description });
    } catch (err) {
      logger.error({ err: err.message }, 'generate-description failed');
      if (err.message?.includes('RESOURCE_EXHAUSTED')) {
        return res.status(503).json({
          error: 'AI is rate-limited right now. Please try again in a minute.',
          degraded: true,
        });
      }
      return res.status(500).json({ error: 'Description generation failed' });
    }
  }
);

module.exports = router;
