import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg, imgUrl } from '../api.js';
import { useTitle } from '../hooks.js';
import { list, money } from '../utils.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import Icon from '../components/Icon.jsx';

const METHOD_ICONS = { cod: 'cash', gcash: 'card', bank: 'store' };

export function Steps({ current }) {
  const steps = ['Cart', 'Details & payment', 'Confirmation'];
  return (
    <ol className="checkout-steps" aria-label="Checkout progress">
      {steps.map((s, i) => (
        <li key={s} className={i < current ? 'done' : i === current ? 'current' : ''} aria-current={i === current ? 'step' : undefined}>
          <span className="dot">{i < current ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}</span>
          <span className="step-label">{s}</span>
        </li>
      ))}
    </ol>
  );
}

export default function Checkout() {
  useTitle('Checkout');
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();

  const [config, setConfig] = useState(null);
  const [address, setAddress] = useState({
    fullName: user?.address?.fullName || user?.name || '',
    phone: user?.address?.phone || '',
    line1: user?.address?.line1 || '',
    city: user?.address?.city || '',
    province: user?.address?.province || '',
    postalCode: user?.address?.postalCode || '',
  });
  const [method, setMethod] = useState('cod');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/config/payment').then((r) => setConfig(r.data)).catch(() => setError('Could not load payment options.'));
  }, []);

  if (items.length === 0) {
    return (
      <div className="empty card">
        <div className="empty-icon"><Icon name="cart" size={28} /></div>
        <h2>Your cart is empty</h2>
        <Link to="/shop" className="btn btn-primary btn-lg">Continue shopping</Link>
      </div>
    );
  }

  const methods = list(config?.methods);
  const rules = config?.shipping || { fee: 100, freeOver: 2000 };
  const shipping = subtotal >= rules.freeOver ? 0 : rules.fee;
  const set = (k) => (e) => setAddress({ ...address, [k]: e.target.value });
  const current = methods.find((m) => m.id === method);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post('/orders', {
        items: items.map((i) => ({ product: i._id, qty: i.qty })),
        shippingAddress: address,
        paymentMethod: method,
        paymentReference: reference,
        notes,
      });
      clear();
      navigate(`/orders/${data._id}`, { state: { placed: true }, replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head"><h1 className="page-title">Checkout</h1></div>
      <Steps current={1} />
      <form className="two-col" onSubmit={submit}>
        <div className="stack">
          <section className="card pad">
            <h3 className="step-title"><span className="num-badge">1</span> Delivery details</h3>
            <div className="form-grid">
              <label>Full name<input required autoComplete="name" value={address.fullName} onChange={set('fullName')} /></label>
              <label>Phone<input required autoComplete="tel" value={address.phone} onChange={set('phone')} inputMode="tel" /></label>
              <label className="span2">Street address<input required autoComplete="street-address" value={address.line1} onChange={set('line1')} /></label>
              <label>City<input required autoComplete="address-level2" value={address.city} onChange={set('city')} /></label>
              <label>Province<input autoComplete="address-level1" value={address.province} onChange={set('province')} /></label>
              <label>Postal code<input autoComplete="postal-code" inputMode="numeric" value={address.postalCode} onChange={set('postalCode')} /></label>
            </div>
          </section>

          <section className="card pad">
            <h3 className="step-title"><span className="num-badge">2</span> Payment</h3>
            <div className="radio-list">
              {methods.map((m) => (
                <label key={m.id} className={`radio ${method === m.id ? 'selected' : ''}`}>
                  <input type="radio" name="pay" checked={method === m.id} onChange={() => setMethod(m.id)} />
                  <Icon name={METHOD_ICONS[m.id] || 'card'} size={20} />
                  <strong>{m.label}</strong>
                </label>
              ))}
              {!config && !error && <div className="skeleton" style={{ height: 52 }} />}
            </div>
            {current && <p className="pay-note"><Icon name="info" size={16} /> <span>{current.instructions}</span></p>}
            {method !== 'cod' && (
              <label>Payment reference number <span className="muted small">(optional — you can add it later)</span>
                <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} />
              </label>
            )}
            <label>Order notes <span className="muted small">(optional)</span>
              <textarea rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
            </label>
          </section>
        </div>

        <aside className="card summary">
          <h3>Order summary</h3>
          <ul className="sum-items">
            {items.map((i) => (
              <li key={i._id}>
                <span className="sum-thumb"><img src={imgUrl(i.image)} alt="" /><em>{i.qty}</em></span>
                <span className="grow small">{i.name}</span>
                <span className="small">{money(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <hr />
          <div className="sum-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div className="sum-row"><span>Shipping</span><span>{shipping === 0 ? <span className="ok">Free</span> : money(shipping)}</span></div>
          <div className="sum-row total"><span>Total</span><span>{money(subtotal + shipping)}</span></div>
          {error && <div className="alert alert-error" role="alert"><Icon name="alert" size={18} /> {error}</div>}
          <button className="btn btn-primary btn-lg btn-block" disabled={busy || !config}>{busy ? 'Placing order…' : 'Place order'}</button>
          <p className="muted small center"><Icon name="lock" size={12} /> Final prices and stock are confirmed when you place your order.</p>
        </aside>
      </form>
    </>
  );
}
