import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api, { errMsg } from '../api.js';
import { PLATFORM } from '../config.js';
import { useTitle } from '../hooks.js';
import { useToast } from '../context/ToastContext.jsx';
import Icon from '../components/Icon.jsx';
import { useAdminStore } from './AdminLayout.jsx';

const TABS = [
  ['general', 'Branding'],
  ['payments', 'Payments'],
  ['shipping', 'Shipping'],
  ['coupons', 'Coupons'],
  ['assistant', 'AI assistant'],
  ['team', 'Team'],
  ['domain', 'Domain'],
];

const fromStore = (s) => ({
  name: s.name,
  customDomain: s.customDomain || '',
  branding: { tagline: '', announcement: '', primaryColor: '', heroTitle: '', heroText: '', heroImage: '', ...(s.branding || {}) },
  settings: {
    supportEmail: '', supportPhone: '', gcashName: '', gcashNumber: '', bankName: '', bankAccountName: '', bankAccountNumber: '',
    enableCod: true, enableGcash: true, enableBank: true, enablePaypal: true, paypalClientId: '',
    chatbotEnabled: true, chatbotName: 'Wise', returnsPolicy: '',
    ...(s.settings || {}),
    shippingFee: s.settings?.shippingFee ?? '',
    freeShippingOver: s.settings?.freeShippingOver ?? '',
    paypalSecret: '',
  },
  coupons: (s.coupons || []).map((c) => ({ ...c })),
});

export default function AdminSettings() {
  useTitle('Store settings');
  const { store, refresh, slug } = useAdminStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'general';
  const [form, setForm] = useState(() => fromStore(store));
  const [busy, setBusy] = useState(false);
  const [staffEmail, setStaffEmail] = useState('');
  const canEdit = store.canEdit;
  const features = store.planDetails?.features || {};

  useEffect(() => { setForm(fromStore(store)); }, [store]);

  const setB = (k) => (e) => setForm((f) => ({ ...f, branding: { ...f.branding, [k]: e.target.value } }));
  const setS = (k) => (e) => setForm((f) => ({ ...f, settings: { ...f.settings, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value } }));
  const setCoupon = (i, k, v) => setForm((f) => ({ ...f, coupons: f.coupons.map((c, j) => (j === i ? { ...c, [k]: v } : c)) }));

  const save = async (e) => {
    e?.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, settings: { ...form.settings } };
      if (!payload.settings.paypalSecret) delete payload.settings.paypalSecret;
      await api.put('/admin/store', payload);
      await refresh();
      qc.invalidateQueries({ queryKey: ['store'] });
      toast('Settings saved');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const addStaff = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/store/staff', { email: staffEmail });
      setStaffEmail('');
      await refresh();
      toast('Team member added');
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };
  const removeStaff = async (u) => {
    if (!window.confirm(`Remove ${u.name} from the team?`)) return;
    try { await api.delete(`/admin/store/staff/${u._id}`); await refresh(); toast('Removed'); } catch (err) { toast(errMsg(err), 'error'); }
  };

  const storeUrl = PLATFORM.domain && !store.isDefault ? `https://${store.slug}.${PLATFORM.domain}` : `${window.location.origin}/${store.isDefault ? '' : `?store=${store.slug}`}`;

  return (
    <>
      {params.get('welcome') && (
        <div className="alert alert-success">
          <Icon name="rocket" size={18} />
          <span><strong>{store.name} is live!</strong> Add your payment details and brand colour here, then head to Products. {store.billing?.status === 'trialing' && `Your ${store.plan} trial runs until ${new Date(store.billing.trialEndsAt).toLocaleDateString()}.`}</span>
        </div>
      )}
      <div className="page-head">
        <div>
          <h1 className="page-title">Store settings</h1>
          <span className="muted small">Your store: <a href={storeUrl} target="_blank" rel="noreferrer">{storeUrl.replace(/^https?:\/\//, '')}</a> · slug <code>{slug}</code></span>
        </div>
        {canEdit && tab !== 'team' && <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>}
      </div>
      {!canEdit && <div className="alert alert-error"><Icon name="lock" size={18} /> Only the store owner can change settings.</div>}

      <div className="tabs scroll-x" role="tablist">
        {TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setParams({ tab: id })}>{label}</button>)}
      </div>

      <form className="card pad stack" onSubmit={save}>
        <fieldset disabled={!canEdit || busy} style={{ border: 0, padding: 0, margin: 0 }} className="stack">
          {tab === 'general' && (
            <div className="form-grid">
              <label>Store name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label>Brand colour <span className="hint">(buttons, links, accents)</span>
                <div className="inline-form"><input type="color" value={form.branding.primaryColor || '#256abf'} onChange={setB('primaryColor')} style={{ width: 64, padding: 4, height: 42 }} /><input value={form.branding.primaryColor} onChange={setB('primaryColor')} placeholder="#256abf" /></div>
              </label>
              <label className="span2">Tagline<input value={form.branding.tagline} onChange={setB('tagline')} maxLength={140} /></label>
              <label className="span2">Announcement bar <span className="hint">(leave empty to show the automatic coupon + countdown)</span><input value={form.branding.announcement} onChange={setB('announcement')} maxLength={160} /></label>
              <label>Hero headline <span className="hint">(home page)</span><input value={form.branding.heroTitle} onChange={setB('heroTitle')} maxLength={90} placeholder="Everyday essentials. Serious value." /></label>
              <label>Hero background image URL<input value={form.branding.heroImage} onChange={setB('heroImage')} placeholder="https://…" /></label>
              <label className="span2">Hero text<textarea rows="2" value={form.branding.heroText} onChange={setB('heroText')} maxLength={240} /></label>
              <label>Support email<input type="email" value={form.settings.supportEmail} onChange={setS('supportEmail')} /></label>
              <label>Support phone<input value={form.settings.supportPhone} onChange={setS('supportPhone')} /></label>
            </div>
          )}

          {tab === 'payments' && (
            <div className="stack">
              <div className="checks">
                <label className="check"><input type="checkbox" checked={form.settings.enableCod} onChange={setS('enableCod')} /> Cash on Delivery</label>
                <label className="check"><input type="checkbox" checked={form.settings.enableGcash} onChange={setS('enableGcash')} /> GCash</label>
                <label className="check"><input type="checkbox" checked={form.settings.enableBank} onChange={setS('enableBank')} /> Bank transfer</label>
                <label className="check"><input type="checkbox" checked={form.settings.enablePaypal} onChange={setS('enablePaypal')} disabled={!features.paypal} /> PayPal {!features.paypal && <Link to="/admin/billing" className="hint">(Pro plan)</Link>}</label>
              </div>
              <h4>GCash</h4>
              <div className="form-grid">
                <label>Account name<input value={form.settings.gcashName} onChange={setS('gcashName')} /></label>
                <label>GCash number<input value={form.settings.gcashNumber} onChange={setS('gcashNumber')} placeholder="09XX XXX XXXX" /></label>
              </div>
              <h4>Bank transfer</h4>
              <div className="form-grid">
                <label>Bank<input value={form.settings.bankName} onChange={setS('bankName')} /></label>
                <label>Account name<input value={form.settings.bankAccountName} onChange={setS('bankAccountName')} /></label>
                <label className="span2">Account number<input value={form.settings.bankAccountNumber} onChange={setS('bankAccountNumber')} /></label>
              </div>
              <h4>PayPal {!features.paypal && <span className="plan-badge pro">Pro</span>}</h4>
              <p className="hint" style={{ margin: 0 }}>From developer.paypal.com → Apps &amp; Credentials. Sandbox keys work for testing (set PAYPAL_MODE on the server).{store.isDefault ? ' The main store can also use PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET from server/.env.' : ''}</p>
              <div className="form-grid">
                <label>Client ID<input value={form.settings.paypalClientId} onChange={setS('paypalClientId')} disabled={!features.paypal} /></label>
                <label>Secret {store.settings?.paypalSecretSet && <span className="ok small">· saved</span>}<input type="password" value={form.settings.paypalSecret} onChange={setS('paypalSecret')} placeholder={store.settings?.paypalSecretSet ? '•••••••• (unchanged)' : ''} disabled={!features.paypal} autoComplete="new-password" /></label>
              </div>
            </div>
          )}

          {tab === 'shipping' && (
            <div className="form-grid">
              <label>Shipping fee (₱)<input type="number" min="0" value={form.settings.shippingFee} onChange={setS('shippingFee')} placeholder="100" /></label>
              <label>Free shipping from (₱)<input type="number" min="0" value={form.settings.freeShippingOver} onChange={setS('freeShippingOver')} placeholder="2000" /></label>
              <p className="hint span2" style={{ margin: 0 }}>Leave empty to use the platform defaults. The free-shipping amount is checked after discounts.</p>
            </div>
          )}

          {tab === 'coupons' && (
            <div className="stack">
              <p className="hint" style={{ margin: 0 }}>Percent off the products in the cart. “Min. products” makes bundle deals (e.g. 3 = needs 3 different products). The first coupon with no minimums is promoted in the announcement bar.</p>
              <div className="coupon-row hint"><span>Code</span><span>% off</span><span>Min. subtotal</span><span>Min. products</span><span>Description</span><span>Active</span><span /></div>
              {form.coupons.map((c, i) => (
                <div className="coupon-row" key={i}>
                  <input value={c.code} onChange={(e) => setCoupon(i, 'code', e.target.value.toUpperCase())} placeholder="CODE" aria-label="Code" />
                  <input type="number" min="1" max="90" value={c.percent} onChange={(e) => setCoupon(i, 'percent', e.target.value)} aria-label="Percent" />
                  <input type="number" min="0" value={c.minSubtotal || ''} onChange={(e) => setCoupon(i, 'minSubtotal', e.target.value)} placeholder="0" aria-label="Minimum subtotal" />
                  <input type="number" min="0" value={c.minItems || ''} onChange={(e) => setCoupon(i, 'minItems', e.target.value)} placeholder="0" aria-label="Minimum products" />
                  <input value={c.description || ''} onChange={(e) => setCoupon(i, 'description', e.target.value)} aria-label="Description" />
                  <input type="checkbox" checked={c.active !== false} onChange={(e) => setCoupon(i, 'active', e.target.checked)} aria-label="Active" />
                  <button type="button" className="icon-btn" aria-label="Delete coupon" onClick={() => setForm((f) => ({ ...f, coupons: f.coupons.filter((_, j) => j !== i) }))}><Icon name="trash" size={15} /></button>
                </div>
              ))}
              <div><button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm((f) => ({ ...f, coupons: [...f.coupons, { code: '', percent: 10, minSubtotal: 0, minItems: 0, description: '', active: true }] }))}><Icon name="plus" size={14} /> Add coupon</button></div>
            </div>
          )}

          {tab === 'assistant' && (
            <div className="stack">
              {!features.aiChat && (
                <div className="alert alert-success" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
                  <Icon name="sparkles" size={18} />
                  <span>On Starter the chat uses the built-in assistant (product search, shipping, payments, returns and order tracking). <Link to="/admin/billing">Upgrade to Pro</Link> for the Claude-powered AI assistant that understands any question.</span>
                </div>
              )}
              <label className="check"><input type="checkbox" checked={form.settings.chatbotEnabled} onChange={setS('chatbotEnabled')} /> Show the “Chat with us” assistant on the store</label>
              <div className="form-grid">
                <label>Assistant name<input value={form.settings.chatbotName} onChange={setS('chatbotName')} maxLength={30} /></label>
              </div>
              <label>Returns policy <span className="hint">(shown on product pages and used by the assistant)</span><textarea rows="4" value={form.settings.returnsPolicy} onChange={setS('returnsPolicy')} maxLength={1500} placeholder="Leave empty for the default 30-day policy" /></label>
            </div>
          )}

          {tab === 'domain' && (
            <div className="stack">
              <p style={{ margin: 0 }}>Every store has its own address: <strong>{storeUrl.replace(/^https?:\/\//, '')}</strong></p>
              <label>Custom domain {!features.customDomain && <span className="plan-badge business">Business</span>}
                <input value={form.customDomain} onChange={(e) => setForm({ ...form, customDomain: e.target.value })} placeholder="shop.yourbrand.ph" disabled={!features.customDomain} />
              </label>
              <p className="hint" style={{ margin: 0 }}>Point a CNAME record for this domain to your {PLATFORM.name} server, then save. The API matches the domain to your store automatically.</p>
            </div>
          )}
        </fieldset>

        {tab === 'team' && (
          <div className="stack">
            <p className="hint" style={{ margin: 0 }}>Seats used: {store.usage?.staff} of {store.planDetails?.limits?.staff ?? '∞'} (including the owner). Staff can manage products, orders and customers; only the owner changes settings and billing.</p>
            <ul className="plain-list">
              <li><Icon name="crown" size={16} /> <span className="grow"><strong>{store.owner?.name || 'Owner'}</strong> <span className="muted small">{store.owner?.email}</span></span><span className="pill">Owner</span></li>
              {(store.staff || []).map((u) => (
                <li key={u._id}><Icon name="user" size={16} /> <span className="grow"><strong>{u.name}</strong> <span className="muted small">{u.email}</span></span>{canEdit && <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => removeStaff(u)}>Remove</button>}</li>
              ))}
            </ul>
            {canEdit && (
              <div className="inline-form">
                <input type="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} placeholder="Teammate’s account email" aria-label="Teammate email" />
                <button type="button" className="btn btn-primary btn-sm" onClick={addStaff} disabled={!staffEmail}>Add</button>
              </div>
            )}
          </div>
        )}
      </form>
    </>
  );
}
