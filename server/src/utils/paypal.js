// Minimal PayPal Orders v2 client (no SDK needed — Node 18+ has fetch).
import { paypalMode } from '../config/settings.js';

const base = () => (paypalMode() === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');

async function token({ clientId, secret }) {
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(`PayPal login failed: ${data.error_description || res.status}`);
  return data.access_token;
}

async function call(creds, method, path, body) {
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await token(creds)}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.details?.[0]?.description || data?.message || `HTTP ${res.status}`;
    const err = new Error(`PayPal: ${detail}`);
    err.status = 502;
    throw err;
  }
  return data;
}

export const toAmount = (n) => (Math.round(Number(n) * 100) / 100).toFixed(2);

/** Creates a PayPal order for an amount and returns its id. */
export async function createPaypalOrder(creds, { amount, currency = 'PHP', reference, description }) {
  const data = await call(creds, 'POST', '/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [{ reference_id: reference, description: description?.slice(0, 120), amount: { currency_code: currency, value: toAmount(amount) } }],
  });
  return data.id;
}

/** Captures an approved PayPal order; returns { status, captureId, amount, currency }. */
export async function capturePaypalOrder(creds, paypalOrderId) {
  const data = await call(creds, 'POST', `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {});
  const capture = data?.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    status: data.status,
    captureId: capture?.id || '',
    amount: Number(capture?.amount?.value || 0),
    currency: capture?.amount?.currency_code || '',
  };
}
