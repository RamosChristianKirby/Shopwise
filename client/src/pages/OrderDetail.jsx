import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import api, { errMsg, imgUrl } from '../api.js';
import { fmtDateTime, money, PAYMENT_LABELS } from '../utils.js';
import { useTitle } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { PageSkeleton } from '../components/Skeleton.jsx';
import { Steps } from './Checkout.jsx';
import { useToast } from '../context/ToastContext.jsx';

const STEPS = ['pending', 'processing', 'shipped', 'delivered'];

export default function OrderDetail() {
  const { id } = useParams();
  const { state } = useLocation();
  const { toast } = useToast();
  const [order, setOrder] = useState(null);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');
  const [ref, setRef] = useState('');

  useTitle(order ? `Order ${order.orderNumber}` : 'Order');

  useEffect(() => {
    api.get(`/orders/${id}`).then((r) => { setOrder(r.data); setRef(r.data.paymentReference || ''); }).catch((e) => setError(errMsg(e)));
    api.get('/config/payment').then((r) => setPayment(r.data)).catch(() => {});
  }, [id]);

  if (error) return <div className="empty card"><div className="empty-icon"><Icon name="alert" size={26} /></div><h3>{error}</h3><Link to="/account" className="btn btn-primary">My orders</Link></div>;
  if (!order) return <PageSkeleton />;

  const cancelled = order.status === 'cancelled';
  const stepIndex = STEPS.indexOf(order.status);
  const instructions = payment?.methods.find((m) => m.id === order.paymentMethod)?.instructions;

  const saveRef = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put(`/orders/${id}/payment-reference`, { paymentReference: ref });
      setOrder(data);
      toast('Payment reference saved');
    } catch (err) { toast(errMsg(err), 'error'); }
  };

  const cancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    try {
      const { data } = await api.put(`/orders/${id}/cancel`);
      setOrder(data);
      toast('Order cancelled');
    } catch (err) { toast(errMsg(err), 'error'); }
  };

  return (
    <>
      {state?.placed && (
        <>
          <Steps current={3} />
          <div className="alert alert-success">
            <Icon name="check" size={18} strokeWidth={3} />
            <span>
              <strong>Thank you! Your order has been placed.</strong>{' '}
              {order.paymentMethod === 'cod' ? 'Please prepare the exact amount for delivery.' : 'Please complete your payment using the details below.'}
            </span>
          </div>
        </>
      )}

      <div className="page-head">
        <div>
          <h1 className="page-title">Order {order.orderNumber}</h1>
          <span className="muted small">Placed {fmtDateTime(order.createdAt)}</span>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {!cancelled && (
        <ol className="steps" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li key={s} className={i <= stepIndex ? 'done' : ''}>
              <span className="dot">{i <= stepIndex ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="two-col">
        <section className="card pad">
          <h3>Items</h3>
          {order.items.map((i) => (
            <div className="cart-line compact" key={i.product + i.name}>
              <span className="cart-thumb"><img src={imgUrl(i.image)} alt="" /></span>
              <div className="cart-info"><strong>{i.name}</strong><div className="muted small">{i.qty} × {money(i.price)}</div></div>
              <strong className="line-total">{money(i.qty * i.price)}</strong>
            </div>
          ))}
          <hr />
          <div className="sum-row"><span>Subtotal</span><span>{money(order.itemsPrice)}</span></div>
          <div className="sum-row"><span>Shipping</span><span>{order.shippingPrice === 0 ? 'Free' : money(order.shippingPrice)}</span></div>
          <div className="sum-row total"><span>Total</span><span>{money(order.totalPrice)}</span></div>
        </section>

        <div className="stack">
          <section className="card pad">
            <h3>Delivery</h3>
            <p>
              {order.shippingAddress.fullName}<br />
              {order.shippingAddress.line1}<br />
              {[order.shippingAddress.city, order.shippingAddress.province, order.shippingAddress.postalCode].filter(Boolean).join(', ')}<br />
              {order.shippingAddress.phone}
            </p>
          </section>

          <section className="card pad">
            <h3>Payment</h3>
            <p><strong>{PAYMENT_LABELS[order.paymentMethod]}</strong> — {order.isPaid ? <span className="ok">Paid</span> : <span className="warn">Not yet paid</span>}</p>
            {!order.isPaid && !cancelled && instructions && <p className="muted small">{instructions}</p>}
            {order.paymentMethod !== 'cod' && !order.isPaid && !cancelled && (
              <form className="inline-form" onSubmit={saveRef}>
                <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Reference number" aria-label="Payment reference" maxLength={100} />
                <button className="btn btn-primary btn-sm">Save</button>
              </form>
            )}
            {order.paymentReference && order.paymentMethod !== 'cod' && <p className="muted small">Reference: {order.paymentReference}</p>}
          </section>

          {order.status === 'pending' && !order.isPaid && (
            <button className="btn btn-danger-ghost" onClick={cancel}>Cancel order</button>
          )}
        </div>
      </div>
    </>
  );
}
