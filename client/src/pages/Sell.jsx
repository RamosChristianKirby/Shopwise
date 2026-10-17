import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api, { errMsg, imgUrl, storage, storeSlugs } from '../api.js';
import { PLATFORM } from '../config.js';
import { useDebounced, useSeo } from '../hooks.js';
import { money } from '../utils.js';
import { useAuth } from '../context/AuthContext.jsx';
import { enterStore } from '../context/StoreContext.jsx';
import Icon from '../components/Icon.jsx';

const FEATURES = [
  ['store', 'Your storefront, your brand', 'Mega-menu navigation, category tiles, deals, bundles and SEO-ready product pages — with your name and colours.'],
  ['cash', 'Checkout Filipinos trust', 'Cash on Delivery, GCash and bank transfer out of the box, plus PayPal and cards on Pro.'],
  ['sparkles', 'AI shopping assistant', 'Answers product, sizing and delivery questions and tracks orders 24/7 from your live catalogue (Pro & Business).'],
  ['layers', 'Variants, stock & compatibility', 'Sizes and colours with stock per option, compatibility lists for gadgets, cascading filters for shoppers.'],
  ['file', 'PDF invoices', 'Every order gets a branded PDF invoice your customers can download any time.'],
  ['trend', 'Sales dashboard', 'Revenue, orders, best sellers and low-stock alerts — on your phone or desktop.'],
];

const FAQ = [
  ['Do I need a credit card to start?', 'No. Starter is free forever, and Pro or Business start with a free trial. You only pay when you decide to keep a paid plan.'],
  ['How do I pay for my plan?', 'With GCash or bank transfer (we confirm your reference number), or instantly with PayPal where available. Every payment gets a PDF invoice.'],
  ['Can I use my own domain?', 'Yes, on Business. Every store also gets its own address on Shopwise from day one.'],
  ['What happens if I downgrade?', 'Your store stays online. Paid features switch off at the end of the period you paid for, and Starter’s 25-product limit applies to new products.'],
];

export function Pricing({ plans, trialDays, yearlyMonthsCharged, currentPlan, onChoose, busy, ctaLabel }) {
  const [cycle, setCycle] = useState('monthly');
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <div className="cycle-toggle" role="group" aria-label="Billing cycle">
          <button className={cycle === 'monthly' ? 'active' : ''} onClick={() => setCycle('monthly')}>Monthly</button>
          <button className={cycle === 'yearly' ? 'active' : ''} onClick={() => setCycle('yearly')}>Yearly<em>2 months free</em></button>
        </div>
      </div>
      <div className="pricing-grid">
        {plans.map((p) => {
          const yearly = cycle === 'yearly';
          const price = yearly ? (p.price * yearlyMonthsCharged) / 12 : p.price;
          const current = currentPlan === p.id;
          return (
            <div key={p.id} className={`plan-card ${p.id === 'pro' ? 'popular' : ''} ${current ? 'current' : ''}`}>
              {(current || p.id === 'pro') && <span className="plan-flag">{current ? 'Current plan' : 'Most popular'}</span>}
              <h3>{p.name}</h3>
              <p className="muted" style={{ margin: 0 }}>{p.tagline}</p>
              <div className="plan-price"><b>{p.price ? money(Math.round(price)).replace(/\.00$/, '') : 'Free'}</b>{p.price > 0 && <span>/ month{yearly ? ', billed yearly' : ''}</span>}</div>
              <ul>{p.highlights.map((h) => <li key={h}><Icon name="check" size={16} strokeWidth={3} /> {h}</li>)}</ul>
              <button className={`btn btn-lg btn-block ${p.id === 'pro' ? 'btn-primary' : 'btn-ghost'}`} disabled={busy || current} onClick={() => onChoose(p, cycle)}>
                {ctaLabel ? ctaLabel(p, current, cycle) : current ? 'Your plan' : p.price && trialDays ? `Start ${trialDays}-day free trial` : 'Start free'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Sell() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => api.get('/plans').then((r) => r.data), staleTime: 10 * 60 * 1000 });
  const directory = useQuery({ queryKey: ['directory'], queryFn: () => api.get('/stores/directory').then((r) => (Array.isArray(r.data) ? r.data : [])) });
  useSeo({ title: `Start your online store · ${PLATFORM.name}`, description: 'Open a store in minutes: catalogue, COD/GCash/bank/PayPal checkout, PDF invoices and an AI shopping assistant. Start free.' });

  useEffect(() => {
    if (hash) setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' }), 150);
  }, [hash, plans.data]);

  const choose = (plan, cycle) => navigate(`/sell/start?plan=${plan.id}&cycle=${cycle}`);

  return (
    <>
      <section className="saas-hero">
        <div className="container saas-hero-inner">
          <div>
            <span className="hero-kicker"><Icon name="rocket" size={14} /> {PLATFORM.name} for sellers</span>
            <h1>Your store. Live today.</h1>
            <p>Everything that powers this shop — storefront, checkout, PDF invoices, sales dashboard and an AI shopping assistant — ready for your brand in minutes.</p>
            <div className="hero-actions" style={{ marginTop: 22 }}>
              <Link to="/sell/start" className="btn btn-primary btn-lg btn-caps">Start free <Icon name="arrow-right" size={18} /></Link>
              <a href="#pricing" className="btn btn-outline-light btn-lg btn-caps">See pricing</a>
            </div>
            <div className="hero-trust"><span><Icon name="check" size={15} /> No card needed</span><span><Icon name="check" size={15} /> {plans.data?.trialDays || 14}-day Pro trial</span><span><Icon name="check" size={15} /> Cancel anytime</span></div>
          </div>
          <div className="mock-window" aria-hidden="true">
            <div className="mock-bar"><i /><i /><i /><span>yourstore.{PLATFORM.domain || 'shopwise.ph'}/admin</span></div>
            <div className="mock-body">
              <div className="mock-kpis">
                <div><b>₱184k</b><span>Revenue · 30d</span></div>
                <div><b>412</b><span>Orders</span></div>
                <div><b>₱447</b><span>Avg. order</span></div>
              </div>
              <div className="mock-bars">{[38, 52, 44, 61, 58, 72, 66, 81, 77, 90, 84, 96].map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}</div>
              <div className="chat-msg bot" style={{ maxWidth: '100%' }}><strong>Wise (AI):</strong> “Our best waterproof speaker under ₱2,000 is the Bluetooth Portable Speaker at ₱1,899 — IPX7 and 16-hour battery.”</div>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="container">
          <div className="band-head"><h2 className="band-title"><small>Everything included</small>Built to sell</h2></div>
          <div className="feature-grid">
            {FEATURES.map(([icon, title, text]) => (
              <div className="feature" key={title}><span className="perk-icon"><Icon name={icon} size={20} /></span><h3>{title}</h3><p>{text}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="band alt">
        <div className="container">
          <div className="band-head"><h2 className="band-title"><small>How it works</small>Three steps to your first sale</h2></div>
          <ol className="how-steps" style={{ padding: 0, margin: 0 }}>
            <li><h3>Create your store</h3><p className="muted" style={{ margin: 0 }}>Pick a name and address. Start empty or with sample products to try things out.</p></li>
            <li><h3>Add products &amp; payments</h3><p className="muted" style={{ margin: 0 }}>Upload photos, set sizes and colours, add your GCash, bank or PayPal details.</p></li>
            <li><h3>Share your link</h3><p className="muted" style={{ margin: 0 }}>Orders, invoices and stock update automatically. Watch sales on your dashboard.</p></li>
          </ol>
        </div>
      </section>

      <section className="band" id="pricing">
        <div className="container">
          <div className="band-head" style={{ justifyContent: 'center', textAlign: 'center' }}><h2 className="band-title"><small>Pricing</small>Simple plans that grow with you</h2></div>
          {plans.isLoading ? <div className="loading-bar" /> : plans.error ? <div className="alert alert-error">{errMsg(plans.error)}</div> : (
            <Pricing plans={plans.data.plans} trialDays={plans.data.trialDays} yearlyMonthsCharged={plans.data.yearlyMonthsCharged} onChoose={choose} />
          )}
        </div>
      </section>

      {directory.data?.length > 0 && (
        <section className="band alt" id="stores">
          <div className="container">
            <div className="band-head"><h2 className="band-title"><small>Live on {PLATFORM.name}</small>Shops you can visit</h2></div>
            <div className="store-cards">
              {directory.data.map((s) => (
                <button key={s.slug} className="store-card" onClick={() => enterStore(s.isDefault ? '' : s.slug)}>
                  <img src={imgUrl(s.image)} alt="" loading="lazy" />
                  <div><strong>{s.name}</strong><span>{s.tagline || `${s.productCount} products`}</span></div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="band">
        <div className="container" style={{ maxWidth: 900 }}>
          <div className="band-head"><h2 className="band-title"><small>FAQ</small>Before you start</h2></div>
          <div className="faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><div>{a}</div></details>)}</div>
          <div style={{ textAlign: 'center', marginTop: 28 }}><Link to="/sell/start" className="btn btn-primary btn-lg btn-caps">Open your store <Icon name="arrow-right" size={18} /></Link></div>
        </div>
      </section>
    </>
  );
}

/* ------------------------------ /sell/start ------------------------------ */

const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);

export function CreateStore() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const params = new URLSearchParams(useLocation().search);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    tagline: '',
    primaryColor: '#256abf',
    plan: ['starter', 'pro', 'business'].includes(params.get('plan')) ? params.get('plan') : 'pro',
    sampleProducts: true,
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => api.get('/plans').then((r) => r.data), staleTime: 10 * 60 * 1000 });
  const slug = slugEdited ? form.slug : slugify(form.name);
  const debounced = useDebounced(slug, 350);
  const check = useQuery({
    queryKey: ['slug', debounced],
    queryFn: () => api.get('/stores/check-slug', { params: { slug: debounced } }).then((r) => r.data),
    enabled: debounced.length >= 3,
  });
  useSeo({ title: 'Open your store', noindex: true });

  if (!user) {
    return (
      <div className="empty card" style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="empty-icon"><Icon name="store" size={28} /></div>
        <h2>Create an account first</h2>
        <p className="muted">Your store is linked to your {PLATFORM.name} account, so you can manage it from anywhere.</p>
        <div className="btn-row" style={{ justifyContent: 'center' }}>
          <Link to="/register" state={{ from: '/sell/start' }} className="btn btn-primary">Create account</Link>
          <Link to="/login" state={{ from: '/sell/start' }} className="btn btn-ghost">Log in</Link>
        </div>
      </div>
    );
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post('/stores', { ...form, slug });
      await refreshUser();
      storage.set('adminStore', data.store.slug);
      storeSlugs.admin = data.store.slug;
      navigate('/admin/settings?welcome=1', { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const status = !slug || slug.length < 3 ? null : check.isFetching || debounced !== slug ? 'checking' : check.data?.available ? 'ok' : 'taken';

  return (
    <div className="two-col" style={{ alignItems: 'start' }}>
      <form className="card pad stack" onSubmit={submit}>
        <div>
          <span className="eyebrow">Step 1 of 1</span>
          <h1 className="page-title" style={{ margin: 0 }}>Open your store</h1>
          <p className="muted" style={{ margin: '6px 0 0' }}>You can change everything later in Settings.</p>
        </div>
        <label>Store name<input required maxLength={60} value={form.name} onChange={set('name')} placeholder="e.g. Urban Threads" /></label>
        <label>Store address
          <div className="slug-field">
            <span>{PLATFORM.domain ? '' : '?store='}</span>
            <input value={slug} onChange={(e) => { setSlugEdited(true); setForm({ ...form, slug: slugify(e.target.value) }); }} placeholder="urban-threads" aria-label="Store address" />
            {PLATFORM.domain && <span style={{ paddingRight: 12 }}>.{PLATFORM.domain}</span>}
          </div>
          {status === 'checking' && <span className="slug-status muted">Checking…</span>}
          {status === 'ok' && <span className="slug-status ok"><Icon name="check" size={13} /> Available</span>}
          {status === 'taken' && <span className="slug-status warn">{check.data?.valid === false ? 'Use 3–40 letters, numbers and dashes' : 'That address is taken or reserved'}</span>}
        </label>
        <label>Tagline <span className="hint">(optional)</span><input maxLength={140} value={form.tagline} onChange={set('tagline')} placeholder="Streetwear made in Manila" /></label>
        <label style={{ maxWidth: 220 }}>Brand colour<input type="color" value={form.primaryColor} onChange={set('primaryColor')} style={{ height: 44, padding: 4 }} /></label>
        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 8 }}>
          <legend className="label" style={{ marginBottom: 8, fontWeight: 600 }}>Plan</legend>
          <div className="radio-list">
            {(plans.data?.plans || []).map((p) => (
              <label key={p.id} className={`radio ${form.plan === p.id ? 'selected' : ''}`}>
                <input type="radio" name="plan" checked={form.plan === p.id} onChange={() => setForm({ ...form, plan: p.id })} />
                <strong>{p.name}</strong>
                <span className="muted small" style={{ marginLeft: 'auto' }}>{p.price ? `${money(p.price)}/mo · ${plans.data.trialDays}-day free trial` : 'Free'}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="check"><input type="checkbox" checked={form.sampleProducts} onChange={set('sampleProducts')} /> Start with sample products (you can delete them later)</label>
        {error && <div className="alert alert-error"><Icon name="alert" size={18} /> {error}</div>}
        <button className="btn btn-primary btn-lg btn-caps" disabled={busy || status === 'taken' || !form.name.trim()}>{busy ? 'Creating your store…' : 'Create my store'}</button>
      </form>
      <aside className="card pad stack summary">
        <h3 style={{ margin: 0 }}>What you get</h3>
        <ul className="plain-list stack" style={{ gap: 8 }}>
          <li><Icon name="store" size={16} /> A storefront with your name, colours and address</li>
          <li><Icon name="trend" size={16} /> Admin: products, orders, customers, sales dashboard</li>
          <li><Icon name="cash" size={16} /> COD, GCash &amp; bank transfer checkout</li>
          <li><Icon name="file" size={16} /> Automatic PDF invoices</li>
          <li><Icon name="sparkles" size={16} /> AI assistant &amp; PayPal on Pro and Business</li>
        </ul>
        <p className="muted small" style={{ margin: 0 }}>Signed in as {user.email}. You’ll be the store owner.</p>
      </aside>
    </div>
  );
}

/** /s/:slug — shareable link that opens a store on the platform. */
export function StoreEntry() {
  const { pathname } = useLocation();
  useEffect(() => {
    const slug = pathname.split('/')[2] || '';
    enterStore(slug === 'main' ? '' : slug);
  }, [pathname]);
  return <div className="spinner-wrap"><span className="spinner" /></div>;
}
