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

api.interceptors.request.use((config) => {
  const token = storage.get('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
