import asyncHandler from '../utils/asyncHandler.js';
import { chat } from '../utils/assistant.js';
import { hasFeature } from '../config/plans.js';

/**
 * POST /api/chat { messages: [{ role, content }], page? }
 * Claude-powered on Pro/Business stores when ANTHROPIC_API_KEY is set; otherwise the
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
