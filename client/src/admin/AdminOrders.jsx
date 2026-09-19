import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errMsg, imgUrl } from '../api.js';
import { fmtDateTime, fmtDate, list, money, PAYMENT_LABELS, STATUSES } from '../utils.js';
import { useTitle } from '../hooks.js';
import { useToast } from '../context/ToastContext.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

// What an order may move to next (delivered and cancelled are final)
const NEXT = {
  pending: ['processing', 'shipped', 'delivered', 'cancelled'],
  processing: ['shipped', 'delivered', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

function OrderModal({ id, onClose, onChanged }) {
  const { toast } = useToast();
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/orders/${id}`).then((r) => setOrder(r.data)).catch((e) => { toast(errMsg(e), 'error'); onClose(); });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn, okMsg) => {
    setBusy(true);
    try { const { data } = await fn(); setOrder(data); toast(okMsg); onChanged(); } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); }
  };

  const changeStatus = (status) => {
    if (status === 'cancelled' && !window.confirm('Cancel this order? Stock will be returned to inventory.')) return;
    run(() => api.put(`/admin/orders/${id}/status`, { status }), `Order marked ${status}`);
  };

  return (
    <Modal title={order ? `Order ${order.orderNumber}` : 'Order'} onClose={onClose} wide>
      {!order ? <Spinner /> : (
        <div className="stack">
          <div className="detail-meta">
            <StatusBadge status={order.status} />
            <span className="muted small">Placed {fmtDateTime(order.createdAt)}</span>
            {order.deliveredAt && <span className="muted small">Delivered {fmtDateTime(order.deliveredAt)}</span>}
          </div>

          <div className="two-col even">
            <div>
              <h4>Customer</h4>
              <p>{order.user?.name || 'Deleted user'}<br /><span className="muted small">{order.user?.email}</span></p>
              <h4>Ship to</h4>
              <p>
                {order.shippingAddress.fullName}<br />{order.shippingAddress.line1}<br />
                {[order.shippingAddress.city, order.shippingAddress.province, order.shippingAddress.postalCode].filter(Boolean).join(', ')}<br />
                {order.shippingAddress.phone}
              </p>
              {order.notes && (<><h4>Customer notes</h4><p>{order.notes}</p></>)}
            </div>
            <div>
              <h4>Payment</h4>
              <p>
                {PAYMENT_LABELS[order.paymentMethod]} — {order.isPaid ? <span className="ok">Paid {order.paidAt ? fmtDate(order.paidAt) : ''}</span> : <span className="warn">Unpaid</span>}
                {order.paymentReference && <><br /><span className="muted small">Reference: <strong>{order.paymentReference}</strong></span></>}
              </p>
              {!order.isPaid && order.status !== 'cancelled' && (
                <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(() => api.put(`/admin/orders/${id}/pay`), 'Marked as paid')}>Mark as paid</button>
              )}
            </div>
          </div>

          <div className="order-lines">
            {order.items.map((i) => (
              <div className="cart-line compact" key={i.product + i.name}>
                <span className="cart-thumb"><img src={imgUrl(i.image)} alt="" /></span>
                <div className="cart-info"><strong>{i.name}</strong><div className="muted small">{i.qty} × {money(i.price)}</div></div>
                <strong className="line-total">{money(i.qty * i.price)}</strong>
              </div>
            ))}
            <div className="sum-row muted"><span>Shipping</span><span>{money(order.shippingPrice)}</span></div>
            <div className="sum-row total"><span>Total</span><span>{money(order.totalPrice)}</span></div>
          </div>

          {NEXT[order.status].length > 0 ? (
            <div>
              <h4>Update status</h4>
              <div className="btn-row">
                {NEXT[order.status].map((s) => (
                  <button key={s} className={`btn btn-sm ${s === 'cancelled' ? 'btn-danger-ghost' : 'btn-ghost'}`} disabled={busy} onClick={() => changeStatus(s)}>
                    Mark {s}
                  </button>
                ))}
              </div>
            </div>
          ) : <p className="muted small">This order is {order.status} and can no longer be changed.</p>}
        </div>
      )}
    </Modal>
  );
}

export default function AdminOrders() {
  useTitle('Orders');
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [search, setSearch] = useState(params.get('q') || '');

  const status = params.get('status') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page')) || 1;

  const load = useCallback(() => {
    api.get('/admin/orders', { params: { status, q, page, limit: 12 } }).then((r) => setData({ ...r.data, items: list(r.data?.items) })).catch((e) => toast(errMsg(e), 'error'));
  }, [status, q, page, toast]);
  useEffect(() => { setData(null); load(); }, [load]);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  return (
    <>
      <div className="page-head"><h1 className="page-title">Orders</h1></div>

      <div className="toolbar">
        <div className="tabs compact scroll-x">
          <button className={!status ? 'active' : ''} onClick={() => update({ status: '' })}>All</button>
          {STATUSES.map((s) => <button key={s} className={status === s ? 'active' : ''} onClick={() => update({ status: s })}>{s}</button>)}
        </div>
        <form className="inline-form" onSubmit={(e) => { e.preventDefault(); update({ q: search.trim() }); }}>
          <input placeholder="Order number…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search by order number" />
          <button className="btn btn-ghost btn-sm">Search</button>
        </form>
      </div>

      {!data ? <Spinner /> : data.items.length === 0 ? <div className="empty card"><h3>No orders found</h3></div> : (
        <div className="card table-wrap">
          <table className="rt">
            <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Payment</th><th className="num">Total</th><th>Status</th></tr></thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o._id} className="click" onClick={() => setOpenId(o._id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpenId(o._id)}>
                  <td data-label="Order" className="cell-main"><strong>{o.orderNumber}</strong></td>
                  <td data-label="Customer">{o.user?.name || 'Deleted user'}</td>
                  <td data-label="Date">{fmtDate(o.createdAt)}</td>
                  <td data-label="Payment"><span>{PAYMENT_LABELS[o.paymentMethod]} <span className={o.isPaid ? 'ok small' : 'warn small'}>{o.isPaid ? '· paid' : '· unpaid'}</span></span></td>
                  <td className="num" data-label="Total">{money(o.totalPrice)}</td>
                  <td data-label="Status"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={(p) => update({ page: String(p) })} />}
      {openId && <OrderModal id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </>
  );
}
