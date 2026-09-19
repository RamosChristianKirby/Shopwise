import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { fmtDate, list, money, PAYMENT_LABELS } from '../utils.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useTitle } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import PasswordField from '../components/PasswordField.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Spinner from '../components/Spinner.jsx';

function Orders() {
  const [orders, setOrders] = useState(null);
  useEffect(() => {
    api.get('/orders/mine').then((r) => setOrders(list(r.data))).catch(() => setOrders([]));
  }, []);

  if (!orders) return <Spinner />;
  if (orders.length === 0) {
    return (
      <div className="empty card">
        <div className="empty-icon"><Icon name="package" size={28} /></div>
        <h3>No orders yet</h3>
        <p className="muted">When you place an order it will show up here.</p>
        <Link to="/shop" className="btn btn-primary">Start shopping</Link>
      </div>
    );
  }
  return (
    <div className="card table-wrap">
      <table className="rt">
        <thead><tr><th>Order</th><th>Date</th><th>Payment</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o._id}>
              <td data-label="Order"><Link to={`/orders/${o._id}`}><strong>{o.orderNumber}</strong></Link></td>
              <td data-label="Date">{fmtDate(o.createdAt)}</td>
              <td data-label="Payment">{PAYMENT_LABELS[o.paymentMethod]} {o.isPaid ? '· paid' : ''}</td>
              <td data-label="Total">{money(o.totalPrice)}</td>
              <td data-label="Status"><StatusBadge status={o.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Profile() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user.name);
  const [address, setAddress] = useState({ fullName: '', phone: '', line1: '', city: '', province: '', postalCode: '', ...(user.address || {}) });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateProfile({ name, address, ...(pw.newPassword ? pw : {}) });
      setPw({ currentPassword: '', newPassword: '' });
      toast('Profile updated');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };
  const set = (k) => (e) => setAddress({ ...address, [k]: e.target.value });

  return (
    <form className="card pad stack" onSubmit={save}>
      <h3>Your details</h3>
      <div className="form-grid">
        <label>Name<input required value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Email<input value={user.email} disabled /></label>
      </div>
      <h3>Default delivery address</h3>
      <div className="form-grid">
        <label>Full name<input value={address.fullName} onChange={set('fullName')} /></label>
        <label>Phone<input value={address.phone} onChange={set('phone')} /></label>
        <label className="span2">Street address<input value={address.line1} onChange={set('line1')} /></label>
        <label>City<input value={address.city} onChange={set('city')} /></label>
        <label>Province<input value={address.province} onChange={set('province')} /></label>
        <label>Postal code<input value={address.postalCode} onChange={set('postalCode')} /></label>
      </div>
      <h3>Change password</h3>
      <div className="form-grid">
        <PasswordField required={false} label="Current password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
        <PasswordField required={false} label="New password" minLength={6} autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
      </div>
      <div><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div>
    </form>
  );
}

export default function Account() {
  useTitle('My account');
  const { user } = useAuth();
  const [tab, setTab] = useState('orders');
  return (
    <>
      <div className="page-head">
        <div><h1 className="page-title">My account</h1><span className="muted small">{user.email}</span></div>
      </div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'orders'} className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>Orders</button>
        <button role="tab" aria-selected={tab === 'profile'} className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>Profile</button>
      </div>
      {tab === 'orders' ? <Orders /> : <Profile />}
    </>
  );
}
