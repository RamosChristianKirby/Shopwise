import { hasFeature } from './plans.js';

// Store settings win; the values in server/.env are the fallback (and what the default store uses).
const pick = (v, fallback) => (v === undefined || v === null || v === '' ? fallback : v);

export const getShippingRules = (store) => ({
  fee: Number(pick(store?.settings?.shippingFee, process.env.SHIPPING_FEE ?? 100)),
  freeOver: Number(pick(store?.settings?.freeShippingOver, process.env.FREE_SHIPPING_OVER ?? 2000)),
});

/** PayPal credentials for a store: its own, or the platform's from .env for the default store. */
export function getPaypalCredentials(store, secret = '') {
  const s = store?.settings || {};
  if (s.paypalClientId && secret) return { clientId: s.paypalClientId, secret };
  if (store?.isDefault && process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
    return { clientId: process.env.PAYPAL_CLIENT_ID, secret: process.env.PAYPAL_CLIENT_SECRET };
  }
  return null;
}

export const paypalMode = () => (process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox');

export const getPaymentInfo = (store) => {
  const s = store?.settings || {};
  const gcashName = pick(s.gcashName, store?.isDefault ? process.env.GCASH_NAME : '') || store?.name || 'the store';
  const gcashNumber = pick(s.gcashNumber, store?.isDefault ? process.env.GCASH_NUMBER : '') || '(number not set)';
  const bankName = pick(s.bankName, store?.isDefault ? process.env.BANK_NAME : '') || 'the bank';
  const bankAccountName = pick(s.bankAccountName, store?.isDefault ? process.env.BANK_ACCOUNT_NAME : '') || store?.name || 'account name';
  const bankAccountNumber = pick(s.bankAccountNumber, store?.isDefault ? process.env.BANK_ACCOUNT_NUMBER : '') || '(account number not set)';

  // The PayPal client id is public; the secret never leaves the server.
  const paypalClientId = s.paypalClientId || (store?.isDefault ? process.env.PAYPAL_CLIENT_ID : '');
  const paypalReady = !!paypalClientId && (store?.isDefault ? !!process.env.PAYPAL_CLIENT_SECRET || !!s.paypalClientId : true);
  const paypalOn = s.enablePaypal !== false && paypalReady && hasFeature(store, 'paypal');

  const methods = [
    s.enableCod !== false && { id: 'cod', label: 'Cash on Delivery', instructions: 'Pay in cash when your order arrives.' },
    s.enableGcash !== false && {
      id: 'gcash',
      label: 'GCash',
      instructions: `Send the total to ${gcashName} at ${gcashNumber}, then enter your reference number below.`,
    },
    s.enableBank !== false && {
      id: 'bank',
      label: 'Bank Transfer',
      instructions: `Transfer the total to ${bankName} — ${bankAccountName} — ${bankAccountNumber}, then enter your reference number below.`,
    },
    paypalOn && {
      id: 'paypal',
      label: 'PayPal',
      instructions: 'Pay securely with PayPal or a debit/credit card on the next page. Your order is confirmed as soon as PayPal approves the payment.',
    },
  ].filter(Boolean);

  return {
    methods: methods.length ? methods : [{ id: 'cod', label: 'Cash on Delivery', instructions: 'Pay in cash when your order arrives.' }],
    shipping: getShippingRules(store),
    paypal: paypalOn ? { clientId: paypalClientId, currency: process.env.PAYPAL_CURRENCY || 'PHP' } : null,
  };
};

export const DEFAULT_RETURNS_POLICY =
  'Changed your mind? Return unused items in their original packaging within 30 days of delivery for a full refund. ' +
  'Damaged or wrong items are replaced free of charge — message us within 7 days with a photo.';
