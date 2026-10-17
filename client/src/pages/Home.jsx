import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { imgUrl } from '../api.js';
import { PLATFORM } from '../config.js';
import { useSeo } from '../hooks.js';
import { money, plural } from '../utils.js';
import { useStore } from '../context/StoreContext.jsx';
import { useCategories, useFacets, useProducts } from '../queries.js';
import Icon from '../components/Icon.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { ProductGridSkeleton } from '../components/Skeleton.jsx';
import { Countdown, Stars } from '../components/ui.jsx';
import { shopUrl } from '../components/SiteChrome.jsx';

const TRUST = [
  ['star', 'Verified customer reviews'],
  ['truck', 'Free shipping on qualifying orders'],
  ['cash', 'Cash on Delivery nationwide'],
  ['rotate', '30-day easy returns'],
  ['shield', 'Secure GCash, bank & PayPal'],
  ['file', 'PDF invoice with every order'],
];

const REVIEWS = [
  { name: 'Sarah M.', rating: 5, date: '2 days ago', title: 'Super fast delivery and great quality!', comment: 'The wireless headphones arrived in 2 days and the sound quality is incredible for the price.', product: 'Wireless Noise-Cancelling Headphones' },
  { name: 'David L.', rating: 5, date: '1 week ago', title: 'Smooth shopping experience', comment: 'Paid with GCash and was confirmed right away. The mechanical keyboard feels amazing to type on.', product: 'Mechanical Keyboard 75%' },
  { name: 'Elena R.', rating: 5, date: '2 weeks ago', title: 'Exceeded my expectations', comment: 'The soy candle and facial serum are now my daily staples. Packed with care and free shipping!', product: 'Scented Soy Candle' },
];

const FAQ = [
  ['How long does delivery take?', 'Metro Manila orders usually arrive in 1–3 business days, the rest of Luzon in 2–5, and Visayas & Mindanao in 3–7. Use the delivery checker on any product page for an estimate to your city.'],
  ['Which payment methods can I use?', 'Cash on Delivery, GCash, bank transfer and — where the store has it switched on — PayPal or card. For GCash and bank transfer you add your reference number after checkout and we confirm it.'],
  ['Can I return something?', 'Yes. Unused items in their original packaging can be returned within 30 days of delivery for a full refund. Damaged or wrong items are replaced free.'],
  ['Do I get an invoice?', 'Every order comes with a downloadable PDF invoice in My account → Orders — handy for work purchases and reimbursements.'],
  ['How do bundles work?', 'Pick 3 or more different products in the Bundle builder and the BUNDLE15 code takes 15% off your whole cart at checkout.'],
  ['Is there someone I can ask?', 'Tap “Chat with us” in the corner — our shopping assistant answers product, sizing, shipping and order questions instantly, day or night.'],
];

function CategoryBand({ category, alt }) {
  const subs = category.subcategories || [];
  if (!subs.length) return null;
  return (
    <section className={`band ${alt ? 'alt' : ''}`} aria-labelledby={`cat-${category._id}`}>
      <div className="container">
        <div className="band-head">
          <div>
            <h2 className="band-title" id={`cat-${category._id}`}><small>{plural(category.productCount, 'product')}</small>Shop {category.name}</h2>
            {category.description && <p className="band-sub">{category.description}.</p>}
          </div>
          <Link to={shopUrl(category.slug)} className="see-all-x">View all {category.name} <Icon name="arrow-right" size={16} /></Link>
        </div>
        <div className="tile-grid">
          {subs.map((s) => (
            <Link key={s.name} to={shopUrl(category.slug, s.name)} className="tile">
              <img src={imgUrl(s.image)} alt="" loading="lazy" />
              <span className="tile-label"><strong>{s.name}</strong><span>{plural(s.count, 'product')} <Icon name="arrow-right" size={13} /></span></span>
            </Link>
          ))}
          <Link to={shopUrl(category.slug)} className="tile all">
            <span className="tile-label"><strong>All {category.name}</strong><span>{plural(category.productCount, 'product')} <Icon name="arrow-right" size={13} /></span></span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { store, isMainStore } = useStore();
  const { data: categories = [], isLoading: catsLoading } = useCategories();
  const { data: featured } = useProducts({ featured: 'true', limit: 8, sort: 'popular' });
  const { data: deals } = useProducts({ onSale: 'true', inStock: 'true', limit: 8, sort: 'popular' });
  const { data: facets } = useFacets('brands', {});

  const totalProducts = categories.reduce((n, c) => n + (c.productCount || 0), 0);
  const welcome = store.coupons?.find((c) => !c.minItems && !c.minSubtotal) || store.coupons?.[0];
  const bundle = store.coupons?.find((c) => c.minItems >= 2);
  const collage = (featured?.items || []).filter((p) => p.images?.length).slice(0, 4);
  const bundleArt = [...(deals?.items || []), ...(featured?.items || [])].filter((p) => p.images?.length).slice(0, 4);
  const brands = (facets?.brands || []).slice(0, 10);
  const activeCats = categories.filter((c) => c.productCount > 0);
  // Average rating across the products shown on the page (weighted by number of reviews).
  const rated = [...(featured?.items || []), ...(deals?.items || [])].filter((p, i, arr) => p.numReviews > 0 && arr.findIndex((x) => x._id === p._id) === i);
  const reviewCount = rated.reduce((n, p) => n + p.numReviews, 0);
  const avgRating = reviewCount ? rated.reduce((n, p) => n + p.rating * p.numReviews, 0) / reviewCount : 0;

  useSeo({
    title: '',
    description: store.branding?.heroText || `${store.branding?.tagline || ''} Shop electronics, fashion, home, beauty and sports with Cash on Delivery, GCash or bank transfer.`,
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: store.name, url: window.location.origin, potentialAction: { '@type': 'SearchAction', target: `${window.location.origin}/shop?q={search_term_string}`, 'query-input': 'required name=search_term_string' } },
  });

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="hero-x">
        {store.branding?.heroImage && <div className="hero-x-bg" style={{ backgroundImage: `url(${imgUrl(store.branding.heroImage)})` }} />}
        <div className="container hero-x-inner">
          <div>
            <span className="hero-kicker"><Icon name="bolt" size={14} /> {welcome ? `Extra ${welcome.percent}% off sitewide` : 'New season, new finds'}</span>
            {store.branding?.heroTitle ? (
              <h1>{store.branding.heroTitle}</h1>
            ) : (
              <h1>Everyday essentials. <span className="hl">Serious</span> <em>value.</em></h1>
            )}
            <p className="lead">{store.branding?.heroText || `${store.branding?.tagline || ''} Electronics, fashion, home, beauty and sports gear — tested, rated and delivered fast.`}</p>
            {welcome && (
              <div className="hero-deal">
                <span>Use code <b>{welcome.code}</b></span>
                <Countdown label="Sale ends in" />
              </div>
            )}
            <div className="hero-actions">
              <Link to="/shop" className="btn btn-primary btn-lg btn-caps">Shop now <Icon name="arrow-right" size={18} /></Link>
              <Link to="/shop?onSale=true" className="btn btn-outline-light btn-lg btn-caps">Today’s deals</Link>
            </div>
            <div className="hero-trust">
              <span><Icon name="star" size={15} /> Verified reviews</span>
              <span><Icon name="truck" size={15} /> Free shipping {money(store.shipping?.freeOver ?? 2000)}+</span>
              <span><Icon name="cash" size={15} /> COD nationwide</span>
            </div>
          </div>
          <div className="hero-collage" aria-hidden={collage.length === 0}>
            {collage.map((p, i) => (
              <Link key={p._id} to={`/product/${p.slug}`} className={`collage-tile c${i + 1}`}>
                <img src={imgUrl(p.images[0])} alt={p.name} />
                {i < 3 && <span className="collage-tag"><span className="ellipsis">{p.name}</span><strong>{money(p.price)}</strong></span>}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Trust marquee ---------------- */}
      <div className="marquee" aria-label="Why shop with us">
        <div className="marquee-track">
          {[...TRUST, ...TRUST].map(([icon, text], i) => (
            <span className="marquee-item" key={i} aria-hidden={i >= TRUST.length}><Icon name={icon} size={18} /> {text}</span>
          ))}
        </div>
      </div>

      {/* ---------------- Shop by category ---------------- */}
      <section className="band">
        <div className="container">
          <div className="band-head">
            <div>
              <h2 className="band-title"><small>{plural(totalProducts, 'product')} · {plural(activeCats.length, 'department')}</small>Shop by department</h2>
              <div className="title-rule" />
            </div>
            <Link to="/shop" className="see-all-x">All products <Icon name="arrow-right" size={16} /></Link>
          </div>
          {catsLoading ? <ProductGridSkeleton count={5} /> : (
            <div className="tile-grid big">
              {activeCats.map((c) => (
                <Link key={c._id} to={shopUrl(c.slug)} className="tile">
                  <img src={imgUrl(c.image)} alt="" loading="lazy" />
                  <span className="tile-label"><strong>{c.name}</strong><span>{plural(c.productCount, 'product')} · {plural((c.subcategories || []).length, 'collection')} <Icon name="arrow-right" size={13} /></span></span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------------- Deals ---------------- */}
      {(deals?.items?.length ?? 1) > 0 && (
        <section className="band alt">
          <div className="container">
            <div className="band-head">
              <div>
                <h2 className="band-title"><small>Limited time</small>Deals of the day</h2>
                <p className="band-sub">Marked-down favourites — prices reset at midnight.</p>
              </div>
              <span className="deals-head-timer"><Icon name="clock" size={16} /> <Countdown /></span>
            </div>
            {!deals ? <ProductGridSkeleton count={4} /> : (
              <div className="rail fit">{deals.items.slice(0, 8).map((p) => <ProductCard key={p._id} product={p} />)}</div>
            )}
            <div style={{ marginTop: 16 }}><Link to="/shop?onSale=true" className="see-all-x">See every deal <Icon name="arrow-right" size={16} /></Link></div>
          </div>
        </section>
      )}

      {/* ---------------- Department bands (subcategory tiles) ---------------- */}
      {activeCats.map((c, i) => (
        <Fragment key={c._id}>
          <CategoryBand category={c} alt={i % 2 === 1} />
          {i === 1 && bundle && (
            <section className="band">
              <div className="container">
                <div className="cta-split">
                  <div className="cta-split-copy">
                    <span className="hero-kicker" style={{ alignSelf: 'flex-start', marginBottom: 0 }}><Icon name="layers" size={14} /> Bundle &amp; save</span>
                    <h2>Build your own bundle</h2>
                    <p>Mix any {bundle.minItems} or more different products — gadgets, skincare, gym gear — and take {bundle.percent}% off the lot with code {bundle.code}.</p>
                    <div className="cta-steps">
                      <div><b>01</b>Pick {bundle.minItems}+ products</div>
                      <div><b>02</b>Code {bundle.code} is added</div>
                      <div><b>03</b>Save {bundle.percent}% instantly</div>
                    </div>
                    <div><Link to="/bundle" className="btn btn-accent btn-lg btn-caps">Start your bundle <Icon name="arrow-right" size={18} /></Link></div>
                  </div>
                  <div className="cta-split-art" aria-hidden="true">
                    {bundleArt.map((p) => <img key={p._id} src={imgUrl(p.images[0])} alt="" loading="lazy" />)}
                  </div>
                </div>
              </div>
            </section>
          )}
        </Fragment>
      ))}

      {/* ---------------- Best sellers ---------------- */}
      <section className="band alt">
        <div className="container">
          <div className="band-head">
            <h2 className="band-title"><small>Customer favourites</small>Best sellers</h2>
            <Link to="/shop?sort=popular" className="see-all-x">Shop best sellers <Icon name="arrow-right" size={16} /></Link>
          </div>
          {!featured ? <ProductGridSkeleton count={8} /> : featured.items.length === 0 ? (
            <div className="empty card"><h3>No products yet</h3><p className="muted">Products you add in the admin panel will show up here.</p></div>
          ) : (
            <div className="grid">{featured.items.map((p) => <ProductCard key={p._id} product={p} />)}</div>
          )}
        </div>
      </section>

      {/* ---------------- Brands ---------------- */}
      {brands.length > 0 && (
        <section className="band">
          <div className="container">
            <div className="band-head"><h2 className="band-title"><small>Trusted makers</small>Shop by brand</h2></div>
            <div className="brand-chips">
              {brands.map((b) => <Link key={b.value} to={`/shop?brand=${encodeURIComponent(b.value)}`} className="brand-chip">{b.value} <small>{b.count}</small></Link>)}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- Reviews ---------------- */}
      <section className="band">
        <div className="container">
          <div className="band-head">
            <div>
              <h2 className="band-title"><small>Reviews</small>What customers say</h2>
            </div>
            {avgRating > 0 && (
              <div className="rating-summary"><b>{avgRating.toFixed(1)}</b><div><Stars value={avgRating} size={18} /><div className="muted small">Average from {reviewCount.toLocaleString()} ratings on these products</div></div></div>
            )}
          </div>
          <div className="reviews-x">
            {REVIEWS.map((r) => (
              <article key={r.name} className="review-x">
                <Stars value={r.rating} size={15} />
                <h3>{r.title}</h3>
                <p>“{r.comment}”</p>
                <footer><strong>{r.name}</strong><span>Verified buyer · {r.product}</span></footer>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- About ---------------- */}
      <section className="band alt">
        <div className="container about-x">
          <div>
            <h2 className="band-title"><small>About {store.name}</small>Good things, honest prices</h2>
            <p className="band-sub" style={{ marginTop: 14 }}>
              {store.name} brings together the everyday things we actually use — reliable gadgets, wardrobe basics, home upgrades, skincare and training gear —
              from brands we’d buy ourselves. Every product page shows real stock, delivery estimates and specs, and every order comes with a PDF invoice.
            </p>
            <div className="btn-row" style={{ marginTop: 18 }}>
              <Link to="/support" className="btn btn-ghost"><Icon name="headset" size={16} /> Help center</Link>
              <button className="btn btn-ghost" onClick={() => window.dispatchEvent(new CustomEvent('chat:open'))}><Icon name="chat" size={16} /> Ask our assistant</button>
            </div>
          </div>
          <div className="stat-grid">
            <div className="stat"><b>{totalProducts || '—'}</b><span>products in stock</span></div>
            <div className="stat"><b>{activeCats.length || '—'}</b><span>departments</span></div>
            <div className="stat"><b>30</b><span>day easy returns</span></div>
            <div className="stat"><b>{money(store.shipping?.freeOver ?? 2000).replace(/\.00$/, '')}</b><span>for free shipping</span></div>
          </div>
        </div>
      </section>

      {/* ---------------- Sell on the platform (SaaS) ---------------- */}
      {isMainStore && (
        <section className="band sell-band">
          <div className="container sell-band-inner">
            <div>
              <span className="hero-kicker"><Icon name="rocket" size={14} /> For sellers</span>
              <h2>Open your own store on {PLATFORM.name}</h2>
              <p>The same storefront, checkout, PDF invoicing and AI assistant you’re using right now — under your own brand. Start free, upgrade when you grow.</p>
              <div className="btn-row">
                <Link to="/sell" className="btn btn-white btn-lg btn-caps">See plans &amp; pricing</Link>
                <Link to="/sell/start" className="btn btn-outline-light btn-lg btn-caps">Start free</Link>
              </div>
            </div>
            <div className="sell-points">
              <div><Icon name="store" size={18} /> Your store live in minutes</div>
              <div><Icon name="cash" size={18} /> COD, GCash, bank &amp; PayPal checkout</div>
              <div><Icon name="sparkles" size={18} /> AI shopping assistant on Pro</div>
              <div><Icon name="trend" size={18} /> Sales dashboard &amp; PDF invoices</div>
            </div>
          </div>
        </section>
      )}

      {/* ---------------- SEO copy ---------------- */}
      <section className="band">
        <div className="container">
          <div className="seo-cols">
            <div>
              <h3>Where to buy everyday essentials online</h3>
              <p>{store.name} is an online store for the Philippines with electronics, fashion, home &amp; living, beauty and sports essentials in one cart. Pay with Cash on Delivery, GCash, bank transfer or PayPal, and track every order from your account.</p>
            </div>
            <div>
              <h3>Gadgets that work with your setup</h3>
              <p>Not sure if earbuds, a keyboard or a power bank will work with your phone or laptop? Every electronics page has a compatibility checker for iPhone, Android, Windows, Mac and more — plus full specs.</p>
            </div>
            <div>
              <h3>Sizes, colours and stock you can trust</h3>
              <p>Choose the exact colour and size before you buy and see live stock for that option. If something sells out, we tell you before checkout — never after.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="band">
        <div className="container" style={{ maxWidth: 900 }}>
          <div className="band-head"><h2 className="band-title"><small>FAQ</small>Questions, answered</h2></div>
          <div className="faq">
            {FAQ.map(([q, a]) => (
              <details key={q}><summary>{q}</summary><div>{a}</div></details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
