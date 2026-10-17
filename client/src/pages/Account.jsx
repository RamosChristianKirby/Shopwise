import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { downloadFile, errMsg, storage, storeSlugs } from '../api.js';
import { fmtDate, list, money, PAYMENT_LABELS } from '../utils.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useTitle } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import PasswordField from '../components/PasswordField.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Spinner from '../components/Spinner.jsx';

function Orders() {
  const { toast } = useToast();
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
        <thead><tr><th>Order</th><th>Date</th><th>Payment</th><th>Total</th><th>Status</th><th /></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o._id}>
              <td data-label="Order"><Link to={`/orders/${o._id}`}><strong>{o.orderNumber}</strong></Link></td>
              <td data-label="Date">{fmtDate(o.createdAt)}</td>
              <td data-label="Payment">{PAYMENT_LABELS[o.paymentMethod]} {o.isPaid ? '· paid' : ''}</td>
              <td data-label="Total">{money(o.totalPrice)}</td>
              <td data-label="Status"><StatusBadge status={o.status} /></td>
              <td className="actions">
                <button className="btn btn-ghost btn-sm" onClick={() => downloadFile(`/orders/${o._id}/invoice.pdf`, `invoice-${o.orderNumber}.pdf`).catch((e) => toast(errMsg(e), 'error'))}>
                  <Icon name="download" size={14} /> Invoice
                </button>
              </td>
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

function Stores() {
  const { stores, isPlatformAdmin } = useAuth();
  const manage = (slug) => {
    storage.set('adminStore', slug);
    storeSlugs.admin = slug;
  };
  return (
    <div className="stack">
      {stores.length === 0 ? (
        <div className="empty card">
          <div className="empty-icon"><Icon name="store" size={28} /></div>
          <h3>You don’t have a store yet</h3>
          <p className="muted">Open your own online store on Shopwise — free to start, live in minutes.</p>
          <Link to="/sell/start" className="btn btn-primary">Open a store</Link>
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="rt">
            <thead><tr><th>Store</th><th>Your role</th><th>Plan</th><th /></tr></thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s._id}>
                  <td data-label="Store" className="cell-main"><strong>{s.name}</strong><div className="muted small">{s.slug}{s.isDefault ? ' · main store' : ''}{s.isActive ? '' : ' · suspended'}</div></td>
                  <td data-label="Role">{s.role}</td>
                  <td data-label="Plan"><span className={`plan-badge ${s.plan}`}>{s.plan}</span></td>
                  <td className="actions">
                    <Link to="/admin" className="btn btn-primary btn-sm" onClick={() => manage(s.slug)}>Manage</Link>
                    <a href={`/?store=${s.isDefault ? '' : s.slug}`} className="btn btn-ghost btn-sm">Visit</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {stores.length > 0 && <div><Link to="/sell/start" className="btn btn-ghost"><Icon name="plus" size={16} /> Open another store</Link></div>}
      {isPlatformAdmin && <p className="muted small">You’re a {`Shopwise`} platform admin — every store is in Admin → Platform.</p>}
    </div>
  );
}

export default function Account() {
  useTitle('My account');
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(['orders', 'profile', 'stores'].includes(params.get('tab')) ? params.get('tab') : 'orders');
  useEffect(() => {
    const t = params.get('tab');
    if (['orders', 'profile', 'stores'].includes(t)) setTab(t);
  }, [params]);
  const doLogout = () => { logout(); navigate('/'); toast('You’re logged out.'); };
  return (
    <>
      <div className="page-head">
        <div><h1 className="page-title">My account</h1><span className="muted small">{user.email}</span></div>
        <button type="button" className="btn btn-ghost" onClick={doLogout}><Icon name="logout" size={16} /> Log out</button>
      </div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'orders'} className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>Orders</button>
        <button role="tab" aria-selected={tab === 'profile'} className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>Profile</button>
        <button role="tab" aria-selected={tab === 'stores'} className={tab === 'stores' ? 'active' : ''} onClick={() => setTab('stores')}>My stores</button>
      </div>
      {tab === 'orders' ? <Orders /> : tab === 'profile' ? <Profile /> : <Stores />}
    </>
  );
}
