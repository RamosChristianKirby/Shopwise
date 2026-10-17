import axios from 'axios';
import { API_ORIGIN, API_URL } from './config.js';

const api = axios.create({ baseURL: API_URL, timeout: 20000 });

export const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
  },
};

/**
 * Which store the API calls are for (multi-store / SaaS):
 *   shop  — the store this website is showing (set by StoreContext)
 *   admin — the store being managed in /admin (can differ from the one being browsed)
 * Sent as the X-Store header; empty means the platform's main store.
 */
export const storeSlugs = { shop: '', admin: storage.get('adminStore') || '' };

api.interceptors.request.use((config) => {
  const token = storage.get('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const url = config.url || '';
  const slug = /^\/?admin(\/|$)/.test(url) ? storeSlugs.admin || storeSlugs.shop : storeSlugs.shop;
  if (slug && !config.headers['X-Store']) config.headers['X-Store'] = slug;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // No response at all = the API is unreachable (down, wrong URL, blocked by CORS…)
    if (!error.response && error.code !== 'ERR_CANCELED') window.dispatchEvent(new Event('api:offline'));
    // A saved login that the API no longer accepts
    if (error.response?.status === 401 && storage.get('token') && !/\/auth\/(login|register)/.test(error.config?.url || '')) {
      storage.remove('token');
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(error);
  }
);

export const errMsg = (e) => {
  if (e?.response?.data?.message) return e.response.data.message;
  if (e && !e.response && e.request) return 'Cannot reach the server. Check your connection and try again.';
  return e?.message || 'Something went wrong';
};

/** Downloads a file from the API (e.g. a PDF invoice) with the login token attached. */
export async function downloadFile(url, filename) {
  const res = await api.get(url, { responseType: 'blob' });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 4000);
}

const NO_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#e6e8ec"/><g fill="none" stroke="#9aa3b0" stroke-width="6" stroke-linejoin="round"><rect x="130" y="140" width="140" height="120" rx="12"/><circle cx="170" cy="185" r="12"/><path d="m140 250 45-45 35 30 20-15 30 30"/></g></svg>'
  );

/** Uploaded images are stored as "/uploads/x.png"; prefix the API's origin when the API is hosted separately. */
export function imgUrl(u) {
  if (!u || typeof u !== 'string') return NO_IMAGE;
  if (u.startsWith('/') && API_ORIGIN) return API_ORIGIN + u;
  return u;
}

export default api;
