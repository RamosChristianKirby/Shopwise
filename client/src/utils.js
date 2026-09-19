import { STORE } from './config.js';

let fmt;
try {
  fmt = new Intl.NumberFormat(STORE.locale, { style: 'currency', currency: STORE.currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
} catch {
  fmt = null;
}

export const money = (n) => {
  const v = Number(n) || 0;
  if (fmt) return fmt.format(v);
  return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const currencySymbol = () => {
  try {
    return new Intl.NumberFormat(STORE.locale, { style: 'currency', currency: STORE.currency }).formatToParts(0).find((p) => p.type === 'currency')?.value || '₱';
  } catch {
    return '₱';
  }
};

export const moneyShort = (n) => {
  const v = Number(n || 0);
  const s = currencySymbol();
  if (Math.abs(v) >= 1_000_000) return `${s}${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${s}${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}k`;
  return `${s}${v.toFixed(0)}`;
};

const safeDate = (d, opts, withTime) => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return withTime ? date.toLocaleString(STORE.locale, opts) : date.toLocaleDateString(STORE.locale, opts);
};
export const fmtDate = (d) => safeDate(d, { year: 'numeric', month: 'short', day: 'numeric' });
export const fmtDateTime = (d) => safeDate(d, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }, true);

/** Anything that should be a list but might not be (a different API, an error page…) */
export const list = (x) => (Array.isArray(x) ? x : []);

export const PAYMENT_LABELS = { cod: 'Cash on Delivery', gcash: 'GCash', bank: 'Bank Transfer' };
export const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
