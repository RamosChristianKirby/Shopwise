import { Link, useNavigate } from 'react-router-dom';
import { imgUrl } from '../api.js';
import { useTitle } from '../hooks.js';
import { money } from '../utils.js';
import { useCart } from '../context/CartContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import Icon from '../components/Icon.jsx';
import CouponBox, { useCouponPreview } from '../components/CouponBox.jsx';

export default function Cart() {
  useTitle('Your cart');
  const { items, setQty, remove, subtotal, clear, distinctProducts } = useCart();
  const { store } = useStore();
  const navigate = useNavigate();
  const coupon = useCouponPreview();
  const rules = store.shipping || { fee: 100, freeOver: 2000 };
  const bundle = store.coupons?.find((c) => c.minItems >= 2);

  if (items.length === 0) {
    return (
      <div className="empty card">
        <div className="empty-icon"><Icon name="cart" size={28} /></div>
        <h2>Your cart is empty</h2>
        <p className="muted">Looks like you haven’t added anything yet.</p>
        <Link to="/shop" className="btn btn-primary btn-lg">Start shopping</Link>
      </div>
    );
  }

  const discount = coupon.error ? 0 : coupon.discount;
  const afterDiscount = subtotal - discount;
  const shipping = afterDiscount >= rules.freeOver ? 0 : rules.fee;
  const remaining = rules.freeOver - afterDiscount;
  const progress = Math.min(100, Math.round((afterDiscount / rules.freeOver) * 100));

  return (
    <>
      <div className="page-head">
        <div><h1 className="page-title">Your cart</h1><span className="muted small">{items.length} line{items.length === 1 ? '' : 's'}</span></div>
      </div>
      {bundle && !coupon.code && distinctProducts > 0 && distinctProducts < bundle.minItems && (
        <div className="alert alert-success" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
          <Icon name="layers" size={18} />
          <span>Add {bundle.minItems - distinctProducts} more different product{bundle.minItems - distinctProducts === 1 ? '' : 's'} and use <strong>{bundle.code}</strong> for {bundle.percent}% off everything. <Link to="/bundle">Open the bundle builder →</Link></span>
        </div>
      )}
      <div className="two-col">
        <div className="card cart-lines">
          {items.map((i) => (
            <div className="cart-line" key={i.key}>
              <Link to={`/product/${i.slug}`} className="cart-thumb"><img src={imgUrl(i.image)} alt="" /></Link>
              <div className="cart-info">
                <Link to={`/product/${i.slug}`} className="product-name">{i.name}</Link>
                {i.variantLabel && <div className="small">{i.variantLabel}</div>}
                <div className="muted small">{money(i.price)} each</div>
                <button className="link-btn danger" onClick={() => remove(i.key)}><Icon name="trash" size={14} /> Remove</button>
              </div>
              <div className="qty" role="group" aria-label={`Quantity of ${i.name}`}>
                <button onClick={() => setQty(i.key, i.qty - 1)} aria-label="Decrease quantity" disabled={i.qty <= 1}><Icon name="minus" size={16} /></button>
                <span>{i.qty}</span>
                <button onClick={() => setQty(i.key, i.qty + 1)} aria-label="Increase quantity" disabled={i.qty >= i.stock}><Icon name="plus" size={16} /></button>
              </div>
              <strong className="line-total">{money(i.price * i.qty)}</strong>
            </div>
          ))}
          <div className="cart-foot"><button className="link-btn" onClick={clear}>Clear cart</button><Link to="/shop" className="link-btn">Continue shopping</Link></div>
        </div>

        <aside className="card summary">
          <h3>Order summary</h3>
          <CouponBox />
          <div className="sum-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          {discount > 0 && <div className="sum-row ok"><span>Discount ({coupon.code})</span><span>−{money(discount)}</span></div>}
          <div className="sum-row"><span>Shipping</span><span>{shipping === 0 ? <span className="ok">Free</span> : money(shipping)}</span></div>
          {remaining > 0 ? (
            <div className="ship-progress">
              <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
              <p className="muted small">Add {money(remaining)} more for free shipping.</p>
            </div>
          ) : <p className="ok small"><Icon name="check" size={14} strokeWidth={3} /> You’ve got free shipping!</p>}
          <div className="sum-row total"><span>Total</span><span>{money(afterDiscount + shipping)}</span></div>
          <button className="btn btn-primary btn-lg btn-block btn-caps" onClick={() => navigate('/checkout')}>Checkout <Icon name="arrow-right" size={18} /></button>
          <p className="muted small center"><Icon name="lock" size={12} /> COD · GCash · Bank{store.features?.paypal ? ' · PayPal' : ''}</p>
        </aside>
      </div>
    </>
  );
}
