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
