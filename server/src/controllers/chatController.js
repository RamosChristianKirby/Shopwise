import asyncHandler from '../utils/asyncHandler.js';
import { chat } from '../utils/assistant.js';
import { hasFeature } from '../config/plans.js';

/**
 * POST /api/chat { messages: [{ role, content }], page? }
 * AI-powered on Pro/Business stores when an AI key is set (free: GROQ_API_KEY or GEMINI_API_KEY;
 * also ANTHROPIC_API_KEY / OPENROUTER_API_KEY). Otherwise, or when a free quota runs out, the
 * built-in assistant answers (search, shipping, payments, returns, order tracking).
 */
export const postChat = asyncHandler(async (req, res) => {
  if (req.store.settings?.chatbotEnabled === false) {
    res.status(403);
    throw new Error('Chat is turned off for this store');
  }
  const allowAI = hasFeature(req.store, 'aiChat');
  const page = typeof req.body.page === 'string' ? req.body.page.slice(0, 200) : '';
  const out = await chat({ store: req.store, user: req.user || null, page }, req.body.messages, { allowAI });
  res.json({ ...out, ai: out.source === 'ai' });
});
