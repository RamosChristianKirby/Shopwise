import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api, { errMsg, storeSlugs } from '../api.js';
import { money } from '../utils.js';
import { useCart } from '../context/CartContext.jsx';
import Icon from './Icon.jsx';

/** Checks the saved coupon against the current cart (the server re-checks it when the order is placed). */
export function useCouponPreview() {
  const { coupon, subtotal, distinctProducts } = useCart();
  const query = useQuery({
    queryKey: [storeSlugs.shop || 'main', 'coupon', coupon, Math.round(subtotal * 100), distinctProducts],
    queryFn: () => api.post('/coupons/validate', { code: coupon, subtotal, itemCount: distinctProducts }).then((r) => r.data),
    enabled: !!coupon && subtotal > 0,
    retry: false,
    staleTime: 30 * 1000,
  });
  return {
    code: coupon,
    discount: query.data?.discount || 0,
    info: query.data,
    error: query.error ? errMsg(query.error) : '',
    checking: query.isFetching,
  };
}

export default function CouponBox() {
  const { coupon, setCoupon } = useCart();
  const preview = useCouponPreview();
  const [code, setCode] = useState('');

  if (coupon) {
    return (
      <div className={`check-result ${preview.error ? 'no' : 'yes'}`} style={{ alignItems: 'center' }}>
        <Icon name={preview.error ? 'alert' : 'percent'} size={18} />
        <span style={{ flex: 1 }}>
          <strong>{coupon}</strong>{' '}
          {preview.checking ? 'checking…' : preview.error ? `— ${preview.error}` : `— ${preview.info?.percent}% off (−${money(preview.discount)})`}
        </span>
        <button type="button" className="link-btn" onClick={() => setCoupon('')}>Remove</button>
      </div>
    );
  }
  return (
    <form className="inline-form" onSubmit={(e) => { e.preventDefault(); if (code.trim()) { setCoupon(code); setCode(''); } }}>
      <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Promo code" aria-label="Promo code" maxLength={30} />
      <button className="btn btn-ghost btn-sm">Apply</button>
    </form>
  );
}
