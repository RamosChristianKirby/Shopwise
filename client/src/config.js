// Runtime settings. Everything here can be changed in client/public/config.js (or dist/config.js
// after building) without rebuilding the site.
const raw = (typeof window !== 'undefined' && window.__APP_CONFIG__) || {};

const str = (v, fallback = '') => (typeof v === 'string' && v.trim() ? v.trim() : fallback);

/** Accepts "localhost:5000/api" or "https://x.com/api/" and returns a clean base URL. */
function cleanApiUrl(input) {
  let u = str(input);
  if (!u) return '';
  if (!u.startsWith('/') && !/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) {
    u = (/^(localhost|127\.|192\.168\.|10\.|\[::1\])/i.test(u) ? 'http://' : 'https://') + u;
  }
  return u.replace(/\/+$/, '');
}

export const API_URL = cleanApiUrl(raw.API_URL) || cleanApiUrl(import.meta.env.VITE_API_URL) || '/api';
export const API_IS_EXTERNAL = /^https?:\/\//i.test(API_URL);
export const API_ORIGIN = (() => {
  try { return API_IS_EXTERNAL ? new URL(API_URL).origin : ''; } catch { return ''; }
})();

export const STORE = {
  name: str(raw.STORE_NAME, 'Shopwise'),
  tagline: str(raw.TAGLINE, 'Everyday essentials, delivered to your door.'),
  announcement: typeof raw.ANNOUNCEMENT === 'string' ? raw.ANNOUNCEMENT.trim() : 'Free shipping on orders over ₱2,000',
  currency: str(raw.CURRENCY, 'PHP'),
  locale: str(raw.LOCALE, 'en-PH'),
};

/**
 * Multi-store (SaaS) settings.
 *   STORE_SLUG       pin this website to one store (e.g. 'urban-threads'); empty = the platform's main store
 *   PLATFORM_DOMAIN  e.g. 'shopwise.ph' — then urban-threads.shopwise.ph opens the "urban-threads" store
 *   PLATFORM_NAME    the name of the platform itself (shown on the "Sell on …" pages)
 */
export const PLATFORM = {
  name: str(raw.PLATFORM_NAME, 'Shopwise'),
  domain: str(raw.PLATFORM_DOMAIN).toLowerCase(),
  storeSlug: str(raw.STORE_SLUG).toLowerCase(),
};

export const SOCIAL = {
  facebook: str(raw.FACEBOOK_URL),
  instagram: str(raw.INSTAGRAM_URL),
  tiktok: str(raw.TIKTOK_URL),
  youtube: str(raw.YOUTUBE_URL),
};
