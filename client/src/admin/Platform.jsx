import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { errMsg } from '../api.js';
import { useTitle } from '../hooks.js';
import { fmtDate, money, moneyShort } from '../utils.js';
import { useToast } from '../context/ToastContext.jsx';
import Icon from '../components/Icon.jsx';
import Spinner from '../components/Spinner.jsx';
import { useAdminStore } from './AdminLayout.jsx';

function Kpi({ icon, label, value, sub }) {
  return (
    <div className="card kpi">
      <span className="kpi-label"><span className="kpi-icon"><Icon name={icon} size={16} /></span><span className="muted small">{label}</span></span>
      <strong className="kpi-value">{value}</strong>
      <span className="kpi-sub"><span className="muted small">{sub}</span></span>
    </div>
  );
}

/** Shopwise operator console: SaaS metrics, every store, plan overrides, suspensions and payment confirmation. */
export default function Platform() {
  useTitle('Platform');
  const { toast } = useToast();
  const qc = useQueryClient();
  const { switchTo } = useAdminStore();
  const [q, setQ] = useState('');
  const overview = useQuery({ queryKey: ['platform', 'overview'], queryFn: () => api.get('/platform/overview').then((r) => r.data) });
  const stores = useQuery({ queryKey: ['platform', 'stores', q], queryFn: () => api.get('/platform/stores', { params: { q } }).then((r) => r.data) });

  const reload = () => qc.invalidateQueries({ queryKey: ['platform'] });
  const run = async (fn, msg) => {
    try { const { data } = await fn(); toast(data?.message || msg); reload(); } catch (e) { toast(errMsg(e), 'error'); }
  };

  const o = overview.data;
  const pending = (stores.data || []).flatMap((s) => s.pendingInvoices.map((inv) => ({ ...inv, store: s })));

  return (
    <>
      <div className="page-head"><div><h1 className="page-title">Platform</h1><span className="muted small">Shopwise SaaS — every store on the platform</span></div></div>

      {!o ? <Spinner /> : (
        <section className="kpi-grid" aria-label="Platform metrics">
          <Kpi icon="trend" label="MRR" value={moneyShort(o.mrr)} sub={`${moneyShort(o.arr)} ARR · ${o.paidStores} paying`} />
          <Kpi icon="store" label="Stores" value={o.stores} sub={`${o.newStores30d} new in 30 days · ${o.trialing} on trial`} />
          <Kpi icon="cart" label="GMV · 30 days" value={moneyShort(o.gmv30d)} sub={`${o.orders30d} orders across all stores`} />
          <Kpi icon="users" label="Accounts" value={o.users} sub={`Conversion ${o.conversionRate.toFixed(0)}% · ${o.pendingInvoices} invoice${o.pendingInvoices === 1 ? '' : 's'} to confirm`} />
        </section>
      )}

      {o && (
        <section className="card pad">
          <div className="chart-head"><h2>Stores by plan</h2></div>
          <div className="pipeline">
            {Object.entries(o.byPlan).map(([plan, n]) => (
              <div key={plan} className="pipe"><span className={`plan-badge ${plan}`}>{plan}</span><strong>{n}</strong></div>
            ))}
          </div>
        </section>
      )}

      {pending.length > 0 && (
        <section className="card pad stack">
          <div className="chart-head"><h2>Payments to confirm</h2></div>
          <ul className="plain-list">
            {pending.map((inv) => (
              <li key={inv.number} style={{ flexWrap: 'wrap' }}>
                <span className="grow"><strong>{inv.store.name}</strong> <span className="muted small">· {inv.number} · {inv.plan} {inv.months} mo · {inv.method}{inv.reference ? ` · ref ${inv.reference}` : ' · no reference yet'}</span></span>
                <strong>{money(inv.amount)}</strong>
                <button className="btn btn-primary btn-sm" onClick={() => run(() => api.put(`/platform/stores/${inv.store._id}/invoices/${inv.number}`, { action: 'confirm' }), 'Confirmed')}>Confirm payment</button>
                <button className="btn btn-danger-ghost btn-sm" onClick={() => window.confirm('Void this invoice?') && run(() => api.put(`/platform/stores/${inv.store._id}/invoices/${inv.number}`, { action: 'void' }), 'Voided')}>Void</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="toolbar">
        <form className="inline-form" onSubmit={(e) => { e.preventDefault(); setQ(e.target.elements.q.value.trim()); }}>
          <input name="q" placeholder="Search stores…" aria-label="Search stores" />
          <button className="btn btn-ghost btn-sm">Search</button>
        </form>
      </div>

      {!stores.data ? <Spinner /> : (
        <div className="card table-wrap">
          <table className="rt">
            <thead><tr><th>Store</th><th>Owner</th><th>Plan</th><th className="num">Products</th><th className="num">Sales · 30d</th><th>Created</th><th /></tr></thead>
            <tbody>
              {stores.data.map((s) => (
                <tr key={s._id}>
                  <td data-label="Store" className="cell-main"><strong>{s.name}</strong><div className="muted small">{s.slug}{s.isDefault ? ' · main' : ''}{s.isActive ? '' : ' · suspended'}</div></td>
                  <td data-label="Owner">{s.owner ? <>{s.owner.name}<div className="muted small">{s.owner.email}</div></> : '—'}</td>
                  <td data-label="Plan">
                    <span className={`plan-badge ${s.effectivePlan}`}>{s.effectivePlan}</span>
                    <div className="muted small">{s.billing.status}{s.billing.status === 'trialing' && s.billing.trialEndsAt ? ` until ${fmtDate(s.billing.trialEndsAt)}` : s.billing.currentPeriodEnd ? ` · until ${fmtDate(s.billing.currentPeriodEnd)}` : ''}</div>
                  </td>
                  <td className="num" data-label="Products">{s.products}</td>
                  <td className="num" data-label="Sales · 30d">{money(s.revenue30d)}<div className="muted small">{s.orders30d} orders</div></td>
                  <td data-label="Created">{fmtDate(s.createdAt)}</td>
                  <td className="actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => { switchTo(s.slug); window.scrollTo(0, 0); }}>Manage</button>
                    <a className="btn btn-ghost btn-sm" href={`/?store=${s.isDefault ? '' : s.slug}`} target="_blank" rel="noreferrer">Visit</a>
                    {!s.isDefault && (
                      <>
                        <select aria-label="Set plan" value="" onChange={(e) => e.target.value && run(() => api.put(`/platform/stores/${s._id}`, { plan: e.target.value, extendDays: 30 }), 'Plan updated')} style={{ width: 'auto', padding: '6px 8px' }}>
                          <option value="">Set plan…</option>
                          <option value="starter">Starter</option>
                          <option value="pro">Pro (+30 days)</option>
                          <option value="business">Business (+30 days)</option>
                        </select>
                        <button className={`btn btn-sm ${s.isActive ? 'btn-danger-ghost' : 'btn-ghost'}`} onClick={() => window.confirm(`${s.isActive ? 'Suspend' : 'Reactivate'} ${s.name}?`) && run(() => api.put(`/platform/stores/${s._id}`, { isActive: !s.isActive }), 'Updated')}>
                          {s.isActive ? 'Suspend' : 'Reactivate'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
