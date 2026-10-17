const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Checks a coupon code against a store and cart. Returns { coupon, discount }
 * or { error } explaining why it doesn't apply. itemCount = number of different products.
 */
export function evaluateCoupon(store, rawCode, { subtotal, itemCount }) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return { coupon: null, discount: 0 };
  const coupon = (store?.coupons || []).find((c) => c.code === code && c.active !== false);
  if (!coupon) return { error: `“${code}” isn’t a valid code for this store` };
  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
    return { error: `${code} needs a subtotal of at least ₱${coupon.minSubtotal.toLocaleString('en-PH')}` };
  }
  if (coupon.minItems && itemCount < coupon.minItems) {
    return { error: `${code} needs ${coupon.minItems} or more different products in your cart` };
  }
  return { coupon, discount: round2((subtotal * coupon.percent) / 100) };
}
