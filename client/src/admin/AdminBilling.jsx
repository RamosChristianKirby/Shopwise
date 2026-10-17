import { useState } from 'react';
import api, { downloadFile, errMsg } from '../api.js';
import { useTitle } from '../hooks.js';
import { fmtDate, money } from '../utils.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import PayPalButtons from '../components/PayPalButtons.jsx';
import { Pricing } from '../pages/Sell.jsx';
import { useAdminStore } from './AdminLayout.jsx';

const ORDER = ['starter', 'pro', 'business'];
const METHOD = { gcash: 'GCash', bank: 'Bank transfer', paypal: 'PayPal', manual: 'Manual' };

function Usage({ label, used, limit }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 8;
  return (
    <div className="usage">
      <div className="usage-row"><span>{label}</span><span className={limit && used >= limit ? 'warn' : 'muted'}>{used} / {limit ?? '∞'}</span></div>
      <div className="meter"><span style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function Checkout({ plan, cycle, store, onClose, onDone }) {
  const { toast } = useToast();
  const pay = store.platformPayment || {};
  const [method, setMethod] = useState(pay.paypalClientId ? 'paypal' : 'gcash');
  const [reference, setReference] = useState('');
  const [invoice, setInvoice] = useState(null);
  const [busy, setBusy] = useState(false);
  const months = cycle === 'yearly' ? 12 : 1;
  const amount = plan.price * (cycle === 'yearly' ? store.yearlyMonthsCharged : 1);

  const create = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/admin/store/billing/checkout', { plan: plan.id, cycle, method, reference });
      setInvoice(data.invoice);
      if (method !== 'paypal') {
        toast('Invoice created — we’ll activate your plan once the payment is confirmed');
        onDone();
      }
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`${plan.name} plan · ${cycle === 'yearly' ? 'yearly' : 'monthly'}`} onClose={onClose}>
      <div className="stack">
        <div className="sum-row total"><span>{months} month{months > 1 ? 's' : ''}</span><span>{money(amount)}</span></div>
        {!invoice ? (
          <>
            <div className="radio-list">
              {pay.paypalClientId && <label className={`radio ${method === 'paypal' ? 'selected' : ''}`}><input type="radio" checked={method === 'paypal'} onChange={() => setMethod('paypal')} /><Icon name="globe" size={18} /><strong>PayPal / card</strong><span className="muted small" style={{ marginLeft: 'auto' }}>activates instantly</span></label>}
              <label className={`radio ${method === 'gcash' ? 'selected' : ''}`}><input type="radio" checked={method === 'gcash'} onChange={() => setMethod('gcash')} /><Icon name="card" size={18} /><strong>GCash</strong></label>
              <label className={`radio ${method === 'bank' ? 'selected' : ''}`}><input type="radio" checked={method === 'bank'} onChange={() => setMethod('bank')} /><Icon name="store" size={18} /><strong>Bank transfer</strong></label>
            </div>
            {method !== 'paypal' && (
              <>
                <p className="pay-note"><Icon name="info" size={16} /> <span>Send {money(amount)} to <strong>{method === 'gcash' ? pay.gcash : pay.bank}</strong>, then enter the reference number. Your plan activates when {`Shopwise`} confirms it (usually within a business day).</span></p>
                <label>Reference number <span className="hint">(you can add it later)</span><input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} /></label>
              </>
            )}
            <button className="btn btn-primary btn-lg" onClick={create} disabled={busy}>{busy ? 'Working…' : method === 'paypal' ? 'Continue to PayPal' : 'Create invoice'}</button>
          </>
        ) : (
          <>
            <p className="muted small" style={{ margin: 0 }}>Invoice {invoice.number}</p>
            <PayPalButtons
              clientId={pay.paypalClientId}
              currency={pay.currency || 'PHP'}
              createUrl={`/admin/store/billing/invoices/${invoice.number}/paypal`}
              captureUrl={`/admin/store/billing/invoices/${invoice.number}/paypal/capture`}
              onPaid={() => { toast(`You’re on ${plan.name} — thank you!`); onDone(); }}
            />
          </>
        )}
      </div>
    </Modal>
  );
}

export default function AdminBilling() {
  useTitle('Plan & billing');
  const { store, refresh } = useAdminStore();
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const [choice, setChoice] = useState(null);
  const [refs, setRefs] = useState({});
  const b = store.billing || {};
  const current = store.effectivePlan;
  const details = store.planDetails || {};
  const invoices = [...(b.invoices || [])].reverse();

  const done = async () => { setChoice(null); await refresh(); refreshUser().catch(() => {}); };

  const choose = async (plan, cycle) => {
    if (plan.id === 'starter') {
      if (!window.confirm('Switch to the free Starter plan? Paid features turn off.')) return;
      try { await api.post('/admin/store/billing/checkout', { plan: 'starter' }); toast('You’re on Starter'); done(); } catch (e) { toast(errMsg(e), 'error'); }
      return;
    }
    setChoice({ plan, cycle });
  };

  const cancel = async () => {
    if (!window.confirm(b.status === 'trialing' ? 'End your trial and move to Starter now?' : 'Cancel? You keep your plan until the end of the paid period.')) return;
    try { await api.post('/admin/store/billing/cancel'); toast('Subscription updated'); done(); } catch (e) { toast(errMsg(e), 'error'); }
  };

  const saveRef = async (number) => {
    try { await api.put(`/admin/store/billing/invoices/${number}`, { reference: refs[number] || '' }); toast('Reference saved'); refresh(); } catch (e) { toast(errMsg(e), 'error'); }
  };

  if (store.isDefault) {
    return (
      <div className="empty card">
        <div className="empty-icon"><Icon name="crown" size={26} /></div>
        <h3>{store.name} is the platform’s main store</h3>
        <p className="muted">It has every feature and isn’t billed. Merchant stores manage their plans here.</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-head"><div><h1 className="page-title">Plan &amp; billing</h1><span className="muted small">{store.name}</span></div></div>

      <div className="two-col even">
        <section className="card pad stack">
          <div className="chart-head" style={{ margin: 0 }}>
            <h2 style={{ margin: 0 }}>Current plan</h2>
            <span className={`plan-badge ${current}`}>{details.name || current}</span>
          </div>
          {b.status === 'trialing' && b.trialEndsAt && <p style={{ margin: 0 }}><Icon name="clock" size={15} /> Free {store.plan} trial — ends <strong>{fmtDate(b.trialEndsAt)}</strong>. Choose a plan below to keep its features.</p>}
          {b.status === 'active' && b.currentPeriodEnd && <p style={{ margin: 0 }}><Icon name="calendar" size={15} /> Renews / paid until <strong>{fmtDate(b.currentPeriodEnd)}</strong></p>}
          {b.status === 'cancelled' && b.currentPeriodEnd && <p className="warn" style={{ margin: 0 }}>Cancelled — {store.plan} features stay on until {fmtDate(b.currentPeriodEnd)}.</p>}
          {current === 'starter' && store.plan !== 'starter' && b.status !== 'trialing' && <p className="warn" style={{ margin: 0 }}>Your {store.plan} period has ended — you’re on Starter until a payment is confirmed.</p>}
          <Usage label="Products" used={store.usage?.products ?? 0} limit={details.limits?.products ?? null} />
          <Usage label="Team seats" used={store.usage?.staff ?? 1} limit={details.limits?.staff ?? null} />
          <ul className="plain-list">
            {Object.entries(details.features || {}).map(([k, on]) => (
              <li key={k}><Icon name={on ? 'check' : 'x'} size={14} /> <span className={on ? '' : 'muted'}>{{ aiChat: 'AI shopping assistant', paypal: 'PayPal checkout', pdfInvoices: 'PDF invoices', coupons: 'Coupons & bundles', customDomain: 'Custom domain', advancedAnalytics: 'Best-seller analytics' }[k] || k}</span></li>
            ))}
          </ul>
          {['trialing', 'active'].includes(b.status) && <div><button className="btn btn-danger-ghost btn-sm" onClick={cancel}>{b.status === 'trialing' ? 'End trial' : 'Cancel subscription'}</button></div>}
        </section>

        <section className="card pad stack">
          <h2 style={{ margin: 0 }}>Invoices</h2>
          {invoices.length === 0 ? <p className="muted" style={{ margin: 0 }}>No invoices yet.</p> : (
            <ul className="plain-list">
              {invoices.map((inv) => (
                <li key={inv.number} style={{ flexWrap: 'wrap' }}>
                  <span className="grow">
                    <strong>{inv.number}</strong> <span className="muted small">· {inv.plan} · {inv.months} mo · {METHOD[inv.method]} · {fmtDate(inv.createdAt)}</span>
                    {inv.status === 'pending' && inv.method !== 'paypal' && (
                      <span className="inline-form" style={{ marginTop: 6 }}>
                        <input value={refs[inv.number] ?? inv.reference ?? ''} onChange={(e) => setRefs({ ...refs, [inv.number]: e.target.value })} placeholder="Payment reference" aria-label="Payment reference" />
                        <button className="btn btn-ghost btn-sm" onClick={() => saveRef(inv.number)}>Save</button>
                      </span>
                    )}
                  </span>
                  <strong>{money(inv.amount)}</strong>
                  <span className={inv.status === 'paid' ? 'ok small' : inv.status === 'pending' ? 'warn small' : 'muted small'}>{inv.status}</span>
                  <button className="icon-btn" title="Download PDF" aria-label={`Download invoice ${inv.number}`} onClick={() => downloadFile(`/admin/store/billing/invoices/${inv.number}.pdf`, `shopwise-${inv.number}.pdf`).catch((e) => toast(errMsg(e), 'error'))}><Icon name="download" size={16} /></button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="stack">
        <h2 className="section-title">Change plan</h2>
        <Pricing
          plans={store.plans || []}
          trialDays={store.trialDays}
          yearlyMonthsCharged={store.yearlyMonthsCharged}
          currentPlan={b.status === 'trialing' ? null : current}
          onChoose={choose}
          ctaLabel={(p, isCurrent) => (isCurrent ? 'Your plan' : ORDER.indexOf(p.id) > ORDER.indexOf(current) || (b.status === 'trialing' && p.id === store.plan) ? `Upgrade to ${p.name}` : p.price ? `Switch to ${p.name}` : 'Downgrade to Starter')}
        />
      </section>

      {choice && <Checkout plan={choice.plan} cycle={choice.cycle} store={store} onClose={() => setChoice(null)} onDone={done} />}
    </>
  );
}
