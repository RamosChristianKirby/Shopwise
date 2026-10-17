// SaaS subscription plans for stores on the Shopwise platform.
// Prices are monthly, in the platform currency (PHP). `null` limits mean unlimited.
// limits.staff = team seats including the owner (Starter = owner only).
export const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 0,
    tagline: 'Everything you need to open your first store.',
    limits: { products: 25, staff: 1 },
    features: { aiChat: false, paypal: false, pdfInvoices: true, coupons: true, customDomain: false, advancedAnalytics: false },
    highlights: ['Up to 25 products', 'COD, GCash & bank transfer', 'PDF invoices', 'Coupons & bundles', 'Your own store address'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 999,
    tagline: 'For growing brands that want automation.',
    limits: { products: 500, staff: 3 },
    features: { aiChat: true, paypal: true, pdfInvoices: true, coupons: true, customDomain: false, advancedAnalytics: true },
    highlights: ['Up to 500 products', 'AI shopping assistant', 'PayPal checkout', '3 team seats', 'Best-seller analytics'],
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 2499,
    tagline: 'For established stores with a team.',
    limits: { products: null, staff: 10 },
    features: { aiChat: true, paypal: true, pdfInvoices: true, coupons: true, customDomain: true, advancedAnalytics: true },
    highlights: ['Unlimited products', 'Everything in Pro', 'Custom domain', '10 team seats', 'Priority support'],
  },
};

export const PLAN_IDS = Object.keys(PLANS);
export const YEARLY_MONTHS_CHARGED = 10; // pay yearly = 2 months free
export const TRIAL_DAYS = 14;
export const GRACE_DAYS = 3;
const DAY = 24 * 60 * 60 * 1000;

/**
 * The plan a store is entitled to right now. A trial or paid period that has ended
 * (plus a short grace period for paid plans) falls back to Starter.
 * The platform's own default store always has every feature.
 */
export function effectivePlanId(store, now = new Date()) {
  if (!store) return 'starter';
  if (store.isDefault) return 'business';
  const plan = PLAN_IDS.includes(store.plan) ? store.plan : 'starter';
  if (plan === 'starter') return 'starter';
  const b = store.billing || {};
  if (b.status === 'trialing' && b.trialEndsAt && new Date(b.trialEndsAt) > now) return plan;
  // A cancelled or overdue subscription keeps its plan until the paid period (plus grace) runs out.
  if (['active', 'cancelled', 'past_due'].includes(b.status) && b.currentPeriodEnd && new Date(b.currentPeriodEnd).getTime() + GRACE_DAYS * DAY > now.getTime()) return plan;
  return 'starter';
}

export const planFor = (store) => PLANS[effectivePlanId(store)];
export const hasFeature = (store, feature) => !!planFor(store).features[feature];

export function publicPlans() {
  return PLAN_IDS.map((id) => {
    const { limits, ...rest } = PLANS[id];
    return { ...rest, limits: { products: limits.products, staff: limits.staff } };
  });
}
