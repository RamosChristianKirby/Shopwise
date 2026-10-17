import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { useSeo } from '../hooks.js';
import { fmtDate, money, PAYMENT_LABELS } from '../utils.js';
import { useStore } from '../context/StoreContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/Icon.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const TABS = [
  ['help', 'help', 'Help center', 'Answers to common questions'],
  ['track', 'package', 'Track an order', 'Status with your order number'],
  ['shipping', 'truck', 'Shipping', 'Times, fees and coverage'],
  ['returns', 'rotate', 'Returns & warranty', '30-day returns, replacements'],
  ['contact', 'headset', 'Contact us', 'Chat, email or phone'],
];

const FAQ = [
  ['How do I pay with GCash or bank transfer?', 'Choose GCash or Bank Transfer at checkout. You’ll see the account details on your order page — send the total, then type your reference number there. We confirm it and start packing.'],
  ['Can I change or cancel my order?', 'Unpaid orders that haven’t been processed can be cancelled from the order page. For changes, message us with your order number as soon as possible.'],
  ['Where do I find my invoice?', 'Open My account → Orders and tap “Invoice” to download a PDF for any order.'],
  ['How do coupon codes work?', 'Type the code in your cart or at checkout. One code per order; the discount is applied to the products before shipping.'],
  ['Do you sell to businesses?', 'Yes — every order includes a PDF invoice, and you can pay by bank transfer. For bulk orders, message us for a quote.'],
];

function TrackOrder() {
  const { user } = useAuth();
  const [form, setForm] = useState({ orderNumber: '', email: user?.email || '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const STEPS = ['pending', 'processing', 'shipped', 'delivered'];

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const { data } = await api.post('/orders/track', form);
      setResult(data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  const stepIndex = result ? STEPS.indexOf(result.status) : -1;

  return (
    <div className="stack">
      <form className="card pad stack" onSubmit={submit}>
        <h3 style={{ margin: 0 }}>Track your order</h3>
        <div className="form-grid">
          <label>Order number<input required placeholder="ORD-20261017-AB12C" value={form.orderNumber} onChange={(e) => setForm({ ...form, orderNumber: e.target.value.toUpperCase() })} /></label>
          <label>Email used for the order<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        </div>
        <div><button className="btn btn-primary" disabled={busy}>{busy ? 'Looking…' : 'Track order'}</button> {user && <Link to="/account" className="link-btn" style={{ marginLeft: 8 }}>or see all your orders</Link>}</div>
        {error && <div className="alert alert-error"><Icon name="alert" size={18} /> {error}</div>}
      </form>
      {result && (
        <div className="card pad stack">
          <div className="page-head" style={{ margin: 0 }}>
            <div><h3 style={{ margin: 0 }}>{result.orderNumber}</h3><span className="muted small">Placed {fmtDate(result.createdAt)} · {money(result.totalPrice)} · {PAYMENT_LABELS[result.paymentMethod]} {result.isPaid ? '(paid)' : '(unpaid)'}</span></div>
            <StatusBadge status={result.status} />
          </div>
          {result.status !== 'cancelled' && (
            <ol className="steps" aria-label="Order progress">
              {STEPS.map((s, i) => (
                <li key={s} className={i <= stepIndex ? 'done' : ''}>
                  <span className="dot">{i <= stepIndex ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          )}
          <ul className="plain-list">{result.items.map((i) => <li key={i.name + i.variantLabel}>{i.qty} × {i.name}{i.variantLabel ? ` (${i.variantLabel})` : ''}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

export default function Support() {
  const [params, setParams] = useSearchParams();
  const { store } = useStore();
  const tab = params.get('tab') || 'help';
  useSeo({ title: 'Help & support', description: `Shipping, returns, payments and order tracking at ${store.name}.` });
  const ship = store.shipping || { fee: 100, freeOver: 2000 };

  return (
    <>
      <div className="shop-banner">
        <div>
          <nav className="crumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><Icon name="chevron-right" size={14} /><span>Support</span></nav>
          <h1 className="page-title">How can we help?</h1>
          <p>Track an order, read our policies, or chat with our assistant — it answers instantly.</p>
        </div>
        <button className="btn btn-white btn-caps" onClick={() => window.dispatchEvent(new CustomEvent('chat:open'))}><Icon name="chat" size={16} /> Chat with us</button>
      </div>

      <div className="support-grid" role="tablist">
        {TABS.map(([id, icon, title, sub]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`support-card ${tab === id ? 'active' : ''}`} onClick={() => setParams({ tab: id })}>
            <span className="perk-icon"><Icon name={icon} size={20} /></span>
            <span><strong>{title}</strong><span>{sub}</span></span>
          </button>
        ))}
      </div>

      {tab === 'help' && <div className="faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><div>{a}</div></details>)}</div>}
      {tab === 'track' && <TrackOrder />}
      {tab === 'shipping' && (
        <div className="card pad stack">
          <h3 style={{ margin: 0 }}>Shipping</h3>
          <table className="spec-table">
            <tbody>
              <tr><th>Metro Manila</th><td>1–3 business days</td></tr>
              <tr><th>Rest of Luzon</th><td>2–5 business days</td></tr>
              <tr><th>Visayas</th><td>3–6 business days</td></tr>
              <tr><th>Mindanao</th><td>4–7 business days</td></tr>
              <tr><th>Shipping fee</th><td>{money(ship.fee)} per order · free on orders of {money(ship.freeOver)} or more</td></tr>
              <tr><th>Cash on Delivery</th><td>Available nationwide</td></tr>
            </tbody>
          </table>
          <p className="muted small" style={{ margin: 0 }}>Orders placed before 2 PM on business days usually ship the same day. You’ll see the status change to “shipped” on your order page.</p>
        </div>
      )}
      {tab === 'returns' && (
        <div className="card pad stack">
          <h3 style={{ margin: 0 }}>Returns &amp; warranty</h3>
          <p style={{ margin: 0 }}>{store.returnsPolicy}</p>
          <p className="muted" style={{ margin: 0 }}>Electronics carry the maker’s warranty (usually 12 months). Keep your PDF invoice — it’s your proof of purchase.</p>
        </div>
      )}
      {tab === 'contact' && (
        <div className="support-grid">
          <button className="support-card" onClick={() => window.dispatchEvent(new CustomEvent('chat:open'))}><span className="perk-icon"><Icon name="chat" size={20} /></span><span><strong>Chat</strong><span>Instant answers, 24/7</span></span></button>
          {store.support?.email && <a className="support-card" href={`mailto:${store.support.email}`}><span className="perk-icon"><Icon name="mail" size={20} /></span><span><strong>Email</strong><span>{store.support.email}</span></span></a>}
          {store.support?.phone && <a className="support-card" href={`tel:${store.support.phone}`}><span className="perk-icon"><Icon name="phone" size={20} /></span><span><strong>Phone</strong><span>{store.support.phone}</span></span></a>}
        </div>
      )}
      {tab === 'privacy' && (
        <div className="card pad stack">
          <h3 style={{ margin: 0 }}>Privacy</h3>
          <p style={{ margin: 0 }}>We use your details only to process and deliver your orders and to answer your messages. Passwords are stored hashed, payments by PayPal never touch our servers, and we never sell your data. You can update your details in My account at any time.</p>
        </div>
      )}
      {tab === 'terms' && (
        <div className="card pad stack">
          <h3 style={{ margin: 0 }}>Terms of sale</h3>
          <p style={{ margin: 0 }}>Prices are in Philippine pesos and include VAT where applicable. Final prices and stock are confirmed when you place your order. Coupon codes can’t be combined. {store.name} may cancel orders that can’t be fulfilled, with a full refund for anything already paid.</p>
        </div>
      )}
    </>
  );
}
