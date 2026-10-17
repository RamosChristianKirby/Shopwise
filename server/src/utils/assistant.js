// Shopwise AI shopping assistant.
// Uses an AI model with tools that read the live catalogue and orders. Free providers work:
// Groq (GROQ_API_KEY) or Google Gemini (GEMINI_API_KEY); Claude (ANTHROPIC_API_KEY) and
// OpenRouter (OPENROUTER_API_KEY) are supported too. With no key, or when a free quota runs
// out, a built-in rule-based assistant answers instead, so the chat always works.
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';
import { getPaymentInfo, getShippingRules, DEFAULT_RETURNS_POLICY } from '../config/settings.js';

const peso = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ORDER_RX = /\bORD-\d{8}-[A-Z0-9]{5}\b/i;
const EMAIL_RX = /[^\s@]+@[^\s@]+\.[^\s@]+/;

/** Compact product shape for the model and for chat cards. */
const card = (p) => ({
  _id: p._id,
  name: p.name,
  slug: p.slug,
  price: p.price,
  compareAtPrice: p.compareAtPrice || 0,
  images: (p.images || []).slice(0, 1),
  stock: p.stock,
  brand: p.brand,
  category: p.category?.name ? { name: p.category.name, slug: p.category.slug } : undefined,
  rating: p.rating,
  hasOptions: (p.variants || []).length > 0,
});

/* ------------------------------ tools (shared) ------------------------------ */

async function searchProducts(store, { query = '', category = '', min_price, max_price, in_stock_only = false, on_sale = false, sort = 'relevance', limit = 5 } = {}) {
  const filter = { store: store._id, isActive: true };
  if (category) {
    const cat = await Category.findOne({ store: store._id, $or: [{ slug: String(category).toLowerCase() }, { name: { $regex: `^${escapeRegex(String(category))}$`, $options: 'i' } }] });
    if (cat) filter.category = cat._id;
  }
  if (min_price || max_price) {
    filter.price = {};
    if (min_price) filter.price.$gte = Number(min_price);
    if (max_price) filter.price.$lte = Number(max_price);
  }
  if (in_stock_only) filter.stock = { $gt: 0 };
  if (on_sale) filter.$expr = { $gt: ['$compareAtPrice', '$price'] };

  const words = String(query).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2).slice(0, 6);
  let items = await Product.find(filter).populate('category', 'name slug').limit(300).lean();
  if (words.length) {
    const scored = items
      .map((p) => {
        const hay = [p.name, p.brand, p.subcategory, p.category?.name, ...(p.tags || []), p.description].join(' ').toLowerCase();
        const name = `${p.name} ${(p.tags || []).join(' ')} ${p.subcategory}`.toLowerCase();
        const score = words.reduce((s, w) => {
          const stem = w.replace(/(es|s)$/, '');
          return s + (name.includes(stem) ? 3 : hay.includes(stem) ? 1 : 0);
        }, 0);
        return { p, score };
      })
      .filter((x) => x.score > 0);
    scored.sort((a, b) => b.score - a.score || b.p.sold - a.p.sold);
    items = scored.map((x) => x.p);
  } else {
    items.sort((a, b) => b.sold - a.sold);
  }
  if (sort === 'price-asc') items.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') items.sort((a, b) => b.price - a.price);
  if (sort === 'rating') items.sort((a, b) => b.rating - a.rating);
  return items.slice(0, Math.min(Number(limit) || 5, 8));
}

async function productDetails(store, slug) {
  const p = await Product.findOne({ store: store._id, slug: String(slug), isActive: true }).populate('category', 'name slug').lean();
  if (!p) return null;
  return p;
}

async function findOrder(store, user, orderNumber, email) {
  const order = await Order.findOne({ store: store._id, orderNumber: String(orderNumber || '').toUpperCase().trim() }).populate('user', 'email').lean();
  if (!order) return { error: 'No order with that number in this store.' };
  const owns = user && String(order.user?._id) === String(user._id);
  const emailOk = email && order.user?.email === String(email).toLowerCase().trim();
  if (!owns && !emailOk) return { error: 'For privacy, ask the customer for the email address used on the order (or to log in).' };
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paid: order.isPaid,
    paymentMethod: order.paymentMethod,
    total: peso(order.totalPrice),
    placed: new Date(order.createdAt).toDateString(),
    items: order.items.map((i) => `${i.qty} × ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''}`),
  };
}

function storeFacts(store) {
  const { fee, freeOver } = getShippingRules(store);
  const pay = getPaymentInfo(store);
  const coupons = (store.coupons || []).filter((c) => c.active !== false);
  return {
    shipping: `Flat ${peso(fee)} shipping; free on orders of ${peso(freeOver)} or more. Metro Manila 1–3 business days, rest of Luzon 2–5, Visayas & Mindanao 3–7.`,
    payments: pay.methods.map((m) => m.label).join(', '),
    returns: store.settings?.returnsPolicy || DEFAULT_RETURNS_POLICY,
    coupons: coupons.length ? coupons.map((c) => `${c.code}: ${c.percent}% off${c.minItems ? ` with ${c.minItems}+ different products` : ''}${c.minSubtotal ? ` over ${peso(c.minSubtotal)}` : ''}`).join('; ') : 'none right now',
    contact: [store.settings?.supportEmail, store.settings?.supportPhone].filter(Boolean).join(' · ') || 'the Support page',
  };
}

/* ------------------------------ AI tools ------------------------------ */

const TOOLS = [
  {
    name: 'search_products',
    description: 'Search this store’s live catalogue. Use for any product question or recommendation. Returns name, slug, price, stock and rating.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keywords, e.g. "wireless earbuds" or "gift for runner"' },
        category: { type: 'string', description: 'Category name or slug to limit to' },
        min_price: { type: 'number' },
        max_price: { type: 'number', description: 'Budget in PHP' },
        in_stock_only: { type: 'boolean' },
        on_sale: { type: 'boolean' },
        sort: { type: 'string', enum: ['relevance', 'price-asc', 'price-desc', 'rating'] },
        limit: { type: 'integer', minimum: 1, maximum: 8 },
      },
    },
  },
  {
    name: 'get_product_details',
    description: 'Full details for one product by slug: description, specs, options/variants with stock, compatibility.',
    input_schema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
  },
  {
    name: 'list_categories',
    description: 'The store’s categories and subcategories.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'track_order',
    description: 'Status of an order. Needs the order number (ORD-YYYYMMDD-XXXXX). If the shopper is not logged in, also needs the email used on the order.',
    input_schema: { type: 'object', properties: { order_number: { type: 'string' }, email: { type: 'string' } }, required: ['order_number'] },
  },
];

async function runTool(ctx, name, input, shown) {
  if (name === 'search_products') {
    const items = await searchProducts(ctx.store, input);
    items.forEach((p) => shown.set(String(p._id), card(p)));
    return items.map((p) => ({ name: p.name, slug: p.slug, price: peso(p.price), was: p.compareAtPrice > p.price ? peso(p.compareAtPrice) : undefined, stock: p.stock, brand: p.brand, category: p.category?.name, rating: p.rating, options: p.optionNames?.length ? p.optionNames.join('/') : undefined }));
  }
  if (name === 'get_product_details') {
    const p = await productDetails(ctx.store, input.slug);
    if (!p) return { error: 'Not found' };
    shown.set(String(p._id), card(p));
    return {
      name: p.name, slug: p.slug, price: peso(p.price), was: p.compareAtPrice > p.price ? peso(p.compareAtPrice) : undefined,
      description: p.description, brand: p.brand, category: p.category?.name, subcategory: p.subcategory, stock: p.stock,
      specs: p.specs, compatibility: p.compatibility, rating: p.rating, reviews: p.numReviews,
      variants: (p.variants || []).map((v) => ({ options: v.options, stock: v.stock, price: v.price ? peso(v.price) : undefined })),
    };
  }
  if (name === 'list_categories') {
    const cats = await Category.find({ store: ctx.store._id }).lean();
    const subs = await Product.aggregate([{ $match: { store: ctx.store._id, isActive: true } }, { $group: { _id: { c: '$category', s: '$subcategory' } } }]);
    return cats.map((c) => ({ name: c.name, slug: c.slug, subcategories: subs.filter((s) => String(s._id.c) === String(c._id) && s._id.s).map((s) => s._id.s) }));
  }
  if (name === 'track_order') return findOrder(ctx.store, ctx.user, input.order_number, input.email);
  return { error: `Unknown tool ${name}` };
}

function systemPrompt(ctx) {
  const f = storeFacts(ctx.store);
  const botName = ctx.store.settings?.chatbotName || 'Wise';
  return [
    `You are ${botName}, the shopping assistant for "${ctx.store.name}", an online store in the Philippines (prices in PHP, ₱).`,
    `Store tagline: ${ctx.store.branding?.tagline || ''}`,
    `Shipping: ${f.shipping}`,
    `Payment methods: ${f.payments}.`,
    `Returns: ${f.returns}`,
    `Active coupon codes: ${f.coupons}.`,
    `Contact: ${f.contact}.`,
    ctx.user ? `The shopper is logged in as ${ctx.user.name}.` : 'The shopper is not logged in.',
    ctx.page ? `They are currently viewing: ${ctx.page}.` : '',
    '',
    'Rules:',
    '- Only talk about this store, its products, orders and policies. Politely steer anything else back to shopping.',
    '- Always use the tools for products, prices, stock and orders. Never invent products, prices, stock or order details.',
    '- Recommend at most 3 products, each with its exact name and price. The chat shows product cards for the products you mention.',
    '- Keep answers short and friendly: 2–5 sentences or a tiny list. Plain text, no markdown headings or tables.',
    '- You cannot place orders, issue refunds or change orders; explain how the shopper can do it (cart, checkout, My account, Support page).',
    '- For order status you need the order number, plus the order email if the shopper is not logged in.',
  ].filter(Boolean).join('\n');
}

/* ------------------------------ AI providers ------------------------------ */

// OpenAI-compatible endpoints (Groq, Gemini, OpenRouter) share one client; Claude has its own.
const PROVIDERS = {
  groq: { key: 'GROQ_API_KEY', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'openai/gpt-oss-120b', label: 'Groq' },
  gemini: { key: 'GEMINI_API_KEY', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-flash-latest', label: 'Gemini' },
  openrouter: { key: 'OPENROUTER_API_KEY', url: 'https://openrouter.ai/api/v1/chat/completions', model: '', label: 'OpenRouter' },
  anthropic: { key: 'ANTHROPIC_API_KEY', url: 'https://api.anthropic.com/v1/messages', model: 'claude-haiku-5-5', label: 'Claude' },
};
const FREE_FIRST = ['groq', 'gemini', 'openrouter', 'anthropic'];

/** The provider to use: AI_PROVIDER if set (and its key exists), otherwise the first key found. */
export function aiProvider() {
  const wanted = String(process.env.AI_PROVIDER || '').toLowerCase().trim();
  const id = wanted ? (PROVIDERS[wanted] && process.env[PROVIDERS[wanted].key] ? wanted : null) : FREE_FIRST.find((p) => process.env[PROVIDERS[p].key]);
  if (!id) return null;
  const p = PROVIDERS[id];
  const model = process.env.AI_MODEL || (id === 'anthropic' && process.env.ANTHROPIC_MODEL) || p.model;
  if (!model) return null; // OpenRouter needs AI_MODEL (e.g. a ":free" model)
  return { id, ...p, model, apiKey: process.env[p.key] };
}

// Free tiers have per-minute and per-day quotas. After a 429 we skip the AI for a short
// cool-down so shoppers get instant built-in answers instead of waiting on a refusal.
let coolUntil = 0;
const COOL_MS = 60 * 1000;

class QuotaError extends Error {}

async function postJson(url, headers, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(25000) });
  const data = await res.json().catch(() => ({}));
  if (res.status === 429) throw new QuotaError(data?.error?.message || 'AI quota reached');
  if (!res.ok) {
    const e = Array.isArray(data) ? data[0]?.error : data?.error;
    throw new Error(e?.message || `AI API error ${res.status}`);
  }
  return data;
}

async function callTool(ctx, name, input, shown) {
  try {
    return await runTool(ctx, name, input || {}, shown);
  } catch (err) {
    return { error: err.message };
  }
}

const ROUNDS = 5;
const TOOL_RESULT_CHARS = 6000; // keeps requests small enough for free-tier token limits
const SORRY = 'Sorry, that took too many steps. Could you ask in a simpler way?';

async function claudeChat(ctx, messages, p) {
  const shown = new Map();
  const convo = messages.map((m) => ({ role: m.role, content: m.content }));
  for (let round = 0; round < ROUNDS; round += 1) {
    // eslint-disable-next-line no-await-in-loop
    const data = await postJson(p.url, { 'x-api-key': p.apiKey, 'anthropic-version': '2023-06-01' }, {
      model: p.model, max_tokens: 700, system: systemPrompt(ctx), tools: TOOLS, messages: convo,
    });
    const toolUses = (data.content || []).filter((b) => b.type === 'tool_use');
    if (data.stop_reason !== 'tool_use' || !toolUses.length) {
      const reply = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      return { reply, products: pickShown(reply, shown), source: 'ai' };
    }
    convo.push({ role: 'assistant', content: data.content });
    const results = [];
    for (const t of toolUses) {
      // eslint-disable-next-line no-await-in-loop
      const out = await callTool(ctx, t.name, t.input, shown);
      results.push({ type: 'tool_result', tool_use_id: t.id, content: JSON.stringify(out).slice(0, TOOL_RESULT_CHARS) });
    }
    convo.push({ role: 'user', content: results });
  }
  return { reply: SORRY, products: [], source: 'ai' };
}

// Tool definitions in OpenAI "function" format (no parameters key when a tool takes none —
// Gemini rejects an object schema with empty properties).
const OPENAI_TOOLS = TOOLS.map((t) => ({
  type: 'function',
  function: {
    name: t.name,
    description: t.description,
    ...(Object.keys(t.input_schema.properties || {}).length ? { parameters: t.input_schema } : {}),
  },
}));

const parseArgs = (s) => {
  if (!s) return {};
  if (typeof s === 'object') return s;
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
};

async function openAIChat(ctx, messages, p) {
  const shown = new Map();
  const convo = [{ role: 'system', content: systemPrompt(ctx) }, ...messages.map((m) => ({ role: m.role, content: m.content }))];
  const headers = { authorization: `Bearer ${p.apiKey}` };
  if (p.id === 'openrouter') Object.assign(headers, { 'HTTP-Referer': process.env.CLIENT_URL || 'https://shopwise.app', 'X-Title': 'Shopwise' });
  for (let round = 0; round < ROUNDS; round += 1) {
    // eslint-disable-next-line no-await-in-loop
    const data = await postJson(p.url, headers, {
      model: p.model, max_tokens: 900, temperature: 0.4, tools: OPENAI_TOOLS, tool_choice: 'auto', messages: convo,
    });
    const msg = data.choices?.[0]?.message || {};
    const calls = msg.tool_calls || [];
    if (!calls.length) {
      const reply = String(msg.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      return { reply, products: pickShown(reply, shown), source: 'ai' };
    }
    convo.push({ role: 'assistant', content: msg.content || '', tool_calls: calls });
    for (const c of calls) {
      // eslint-disable-next-line no-await-in-loop
      const out = await callTool(ctx, c.function?.name, parseArgs(c.function?.arguments), shown);
      convo.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(out).slice(0, TOOL_RESULT_CHARS) });
    }
  }
  return { reply: SORRY, products: [], source: 'ai' };
}

/** Product cards to show: the ones named in the reply, otherwise the first few looked at. */
function pickShown(reply, shown) {
  const all = [...shown.values()];
  const text = reply.toLowerCase();
  const named = all.filter((p) => text.includes(p.name.toLowerCase()));
  return (named.length ? named : /no |couldn|can't|cannot|sorry/i.test(reply) ? [] : all).slice(0, 3);
}

/* ------------------------------ built-in fallback ------------------------------ */

const STOP = new Set('i im me my we you your a an the and or for to of in on with at by is are be do does can could would should want need looking look find show any some something have has get got please pls thanks thank hi hello hey what which who how much many price cost under below less than over above more between budget around about cheap cheaper best good nice new item items product products stuff thing things buy recommend suggest give idea ideas gift gifts sale sales discount discounts deal deals promo promos coupon coupons voucher vouchers code codes cheaper option options one ones other others show more less expensive lower'.split(' '));

function parseBudget(text) {
  const t = text.toLowerCase().replace(/,/g, '');
  const num = (s) => Number(s.replace(/[^\d.]/g, ''));
  let m = t.match(/(?:under|below|less than|max(?:imum)?|up to|within|budget(?: of| is)?)\s*(?:php|₱|p)?\s*(\d+(?:\.\d+)?)\s*(k)?/);
  if (m) return { max: num(m[1]) * (m[2] ? 1000 : 1) };
  m = t.match(/(?:over|above|more than|at least)\s*(?:php|₱|p)?\s*(\d+(?:\.\d+)?)\s*(k)?/);
  if (m) return { min: num(m[1]) * (m[2] ? 1000 : 1) };
  m = t.match(/(?:between|from)\s*(?:php|₱)?\s*(\d+)\s*(?:and|to|-)\s*(?:php|₱)?\s*(\d+)/);
  if (m) return { min: num(m[1]), max: num(m[2]) };
  return {};
}

async function fallbackChat(ctx, messages) {
  const last = String(messages[messages.length - 1]?.content || '');
  const text = last.toLowerCase();
  const f = storeFacts(ctx.store);
  const name = ctx.store.settings?.chatbotName || 'Wise';
  const base = { source: 'assistant', products: [] };

  // Order tracking (may carry the order number and email from earlier messages)
  const history = messages.filter((m) => m.role === 'user').map((m) => String(m.content)).join(' ');
  const orderNo = last.match(ORDER_RX)?.[0] || (/(order|track|status|deliver|where)/i.test(text) ? history.match(ORDER_RX)?.[0] : null);
  if (orderNo) {
    const email = last.match(EMAIL_RX)?.[0] || history.match(EMAIL_RX)?.[0];
    const o = await findOrder(ctx.store, ctx.user, orderNo, email);
    if (o.error) return { ...base, reply: ctx.user ? `I couldn’t find ${orderNo.toUpperCase()} on your account. Double-check the number in My account → Orders.` : `To look up ${orderNo.toUpperCase()}, please send the email address you used for that order (or log in).`, suggestions: ['Shipping times', 'Talk to a person'] };
    return { ...base, reply: `Order ${o.orderNumber} is **${o.status}** and ${o.paid ? 'paid' : 'not paid yet'} (${o.total}, placed ${o.placed}). Items: ${o.items.join(', ')}.`, suggestions: ['Shipping times', 'Return policy'] };
  }
  if (/\b(track|where is|order status|my order)\b/.test(text)) {
    return { ...base, reply: 'Happy to check! Send your order number (it looks like ORD-20261017-AB12C)' + (ctx.user ? '.' : ' and the email you ordered with.'), suggestions: ['Shipping times'] };
  }
  if (/^(hi|hello|hey|good (morning|afternoon|evening)|yo|kumusta|musta)\b/.test(text) || text.trim().length < 3) {
    return { ...base, reply: `Hi! I’m ${name}, the ${ctx.store.name} shopping assistant. Ask me to find products, compare options, or check shipping, payments and your order.`, suggestions: ['Best sellers', 'Gift ideas under ₱1,500', 'Shipping times', 'Track my order'] };
  }
  if (/(ship|deliver|how long|arrive|courier|shipping fee)/.test(text)) return { ...base, reply: f.shipping, suggestions: ['Payment options', 'Return policy'] };
  if (/(pay|gcash|bank|cod|cash on delivery|paypal|card)/.test(text)) return { ...base, reply: `You can pay with ${f.payments}. For GCash and bank transfer you add the reference number after checkout, and the store confirms it.`, suggestions: ['Shipping times', 'Any discount codes?'] };
  if (/(return|refund|exchange|warranty|damaged|broken|wrong item)/.test(text)) return { ...base, reply: f.returns, suggestions: ['Talk to a person'] };
  if (/(human|person|agent|contact|email|phone|call|support)/.test(text)) return { ...base, reply: `You can reach the ${ctx.store.name} team at ${f.contact}, or use the form on the Support page.`, suggestions: ['Track my order'] };

  const budget = parseBudget(text);
  const wantsSale = /(sale|discount|deal|promo|coupon|voucher|code)/.test(text);
  const cheaper = /(cheap|cheaper|less expensive|lower price|budget)/.test(text);
  let keywords = text.split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+k?$/.test(w));
  // "Cheaper options" / "show more" refer back to the previous product question.
  if (!keywords.length && /(cheaper|other|more|less expensive)/.test(text)) {
    const prev = messages.filter((m) => m.role === 'user').slice(0, -1).reverse().find((m) => /[a-z]{3,}/i.test(m.content));
    if (prev) keywords = String(prev.content).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+k?$/.test(w));
  }
  if (wantsSale && !keywords.length) {
    const items = await searchProducts(ctx.store, { on_sale: true, in_stock_only: true, max_price: budget.max, limit: 3 });
    return { ...base, reply: `Codes you can use: ${f.coupons}. Here are some items on sale right now:`, products: items.map(card), suggestions: ['Best sellers', 'Shipping times'] };
  }

  const gift = /(gift|present|regalo|birthday|christmas)/.test(text);
  const best = /(best ?sell|popular|trending|top)/.test(text);
  const items = await searchProducts(ctx.store, {
    query: keywords.join(' '),
    min_price: budget.min,
    max_price: budget.max,
    in_stock_only: true,
    on_sale: wantsSale,
    sort: cheaper ? 'price-asc' : best || gift ? 'rating' : 'relevance',
    limit: 3,
  });
  if (items.length && (keywords.length || budget.max || budget.min || gift || best || cheaper)) {
    const intro = gift ? 'Some gift ideas customers love' : best ? 'Our best sellers right now' : cheaper ? 'Lower-priced picks' : 'Here’s what I found';
    const range = budget.max ? ` under ${peso(budget.max)}` : budget.min ? ` over ${peso(budget.min)}` : '';
    return {
      ...base,
      reply: `${intro}${range}: ${items.map((p) => `${p.name} (${peso(p.price)})`).join(', ')}. Tap a card to see details and options.`,
      products: items.map(card),
      suggestions: ['Cheaper options', 'Shipping times', 'Any discount codes?'],
    };
  }
  return {
    ...base,
    reply: `I couldn’t find a match for that. Try a product type like “earbuds”, “yoga mat” or “serum”, or tell me a budget — e.g. “gifts under ₱1,000”.`,
    suggestions: ['Best sellers', 'Gift ideas under ₱1,500', 'Any discount codes?'],
  };
}

/** Entry point: { reply, products, suggestions?, source } */
export async function chat(ctx, rawMessages, { allowAI = true } = {}) {
  const messages = (Array.isArray(rawMessages) ? rawMessages : [])
    .filter((m) => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }));
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return { reply: 'Ask me anything about our products, shipping or your order.', products: [], source: 'assistant' };
  }
  const p = allowAI ? aiProvider() : null;
  if (p && Date.now() >= coolUntil) {
    try {
      // Free tiers count tokens per minute, so send a shorter history to them.
      const recent = p.id === 'anthropic' ? messages : messages.slice(-8);
      while (recent.length && recent[0].role !== 'user') recent.shift();
      const out = p.id === 'anthropic' ? await claudeChat(ctx, recent, p) : await openAIChat(ctx, recent, p);
      if (out.reply) return out;
    } catch (err) {
      if (err instanceof QuotaError) coolUntil = Date.now() + COOL_MS;
      console.warn(`AI chat (${p.label}) fell back to the built-in assistant: ${err.message}`);
    }
  }
  return fallbackChat(ctx, messages);
}

export const _test = { parseBudget, searchProducts, fallbackChat };
