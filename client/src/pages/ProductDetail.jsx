import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { imgUrl } from '../api.js';
import { useSeo } from '../hooks.js';
import { list, money, percentOff } from '../utils.js';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { useProduct } from '../queries.js';
import Icon from '../components/Icon.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { PageSkeleton } from '../components/Skeleton.jsx';
import { Stars, StockDot } from '../components/ui.jsx';
import VariantPicker, { defaultSelection, findVariant, optionNames, variantView } from '../components/VariantPicker.jsx';
import { CompatibilityChecker, DeliveryChecker } from '../components/Checkers.jsx';
import { shopUrl } from '../components/SiteChrome.jsx';

export default function ProductDetail() {
  const { slug } = useParams();
  const { add, setCoupon } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { toast } = useToast();
  const { store } = useStore();
  const navigate = useNavigate();
  const { data, error, isLoading } = useProduct(slug);
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState({});
  const [tab, setTab] = useState('description');
  const [pairPicks, setPairPicks] = useState([]);

  const product = data?.product;

  // Lift the chat button above the sticky "Add to cart" bar on phones.
  useEffect(() => {
    document.body.classList.add('has-buybar');
    return () => document.body.classList.remove('has-buybar');
  }, []);

  useEffect(() => {
    setActive(0);
    setQty(1);
    setTab('description');
    setSelected(product ? defaultSelection(product) : {});
    setPairPicks(list(data?.pairs).map((p) => p._id));
  }, [product?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasVariants = (product?.variants || []).length > 0;
  const variant = useMemo(() => (product ? variantView(product, findVariant(product, selected)) : null), [product, selected]);
  const price = variant?.price ?? product?.price ?? 0;
  const compareAt = variant?.compareAtPrice ?? product?.compareAtPrice ?? 0;
  const stock = hasVariants ? (variant ? variant.stock : 0) : product?.stock ?? 0;
  const off = percentOff(price, compareAt);

  // When a variant has its own photo, show it.
  useEffect(() => {
    if (!variant?.image || !product) return;
    const i = product.images.indexOf(variant.image);
    if (i >= 0) setActive(i);
  }, [variant?.image]); // eslint-disable-line react-hooks/exhaustive-deps

  useSeo(
    product
      ? {
          title: product.name,
          description: `${product.description} ${product.brand ? `By ${product.brand}.` : ''}`.slice(0, 158),
          image: imgUrl(product.images?.[0]),
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            description: product.description,
            image: (product.images || []).map(imgUrl),
            brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
            sku: variant?.sku || product._id,
            ...(product.numReviews > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.numReviews } } : {}),
            offers: { '@type': 'Offer', priceCurrency: 'PHP', price, availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: window.location.href },
          },
        }
      : { title: 'Product' }
  );

  if (error) {
    return (
      <div className="empty card">
        <div className="empty-icon"><Icon name="search" size={26} /></div>
        <h3>{error.response?.status === 404 ? 'This product could not be found.' : 'Could not load this product.'}</h3>
        <Link to="/shop" className="btn btn-primary">Back to shop</Link>
      </div>
    );
  }
  if (isLoading || !product) return <PageSkeleton />;

  const related = list(data.related);
  const pairs = list(data.pairs);
  const out = !(stock > 0);
  const needsChoice = hasVariants && !variant;
  const images = product.images?.length ? product.images : [''];
  const wish = isWishlisted(product._id);
  const names = optionNames(product);
  const bundleCoupon = store.coupons?.find((c) => c.minItems >= 2 && c.minItems <= 1 + pairs.length);

  const addToCart = (then) => {
    if (needsChoice) {
      toast(`Please choose ${names.filter((n) => !selected[n]).join(' and ').toLowerCase()}`, 'error');
      return false;
    }
    add(product, qty, !then, variant);
    toast(`Added ${qty} × “${product.name}${variant?.label ? ` (${variant.label})` : ''}” to your cart`);
    if (then) then();
    return true;
  };

  const pairItems = pairs.filter((p) => pairPicks.includes(p._id));
  const pairTotal = price + pairItems.reduce((s, p) => s + p.price, 0);
  const addPairs = () => {
    if (!addToCart(() => {})) return;
    pairItems.forEach((p) => add(p, 1, false));
    if (bundleCoupon && 1 + pairItems.length >= bundleCoupon.minItems) {
      setCoupon(bundleCoupon.code);
      toast(`Bundle added — ${bundleCoupon.code} (${bundleCoupon.percent}% off) will be applied at checkout`);
    }
    navigate('/cart');
  };

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link><Icon name="chevron-right" size={14} />
        <Link to="/shop">Shop</Link>
        {product.category && <><Icon name="chevron-right" size={14} /><Link to={shopUrl(product.category.slug)}>{product.category.name}</Link></>}
        {product.subcategory && <><Icon name="chevron-right" size={14} /><Link to={shopUrl(product.category?.slug, product.subcategory)}>{product.subcategory}</Link></>}
        <Icon name="chevron-right" size={14} /><span aria-current="page">{product.name}</span>
      </nav>

      <div className="detail">
        <div className="gallery">
          <div className="gallery-main card">
            <img src={imgUrl(images[active])} alt={product.name} />
            {off > 0 && !out && <span className="tag tag-sale">-{off}%</span>}
          </div>
          {images.length > 1 && (
            <div className="thumbs">
              {images.map((src, i) => (
                <button key={i} className={i === active ? 'active' : ''} onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`} aria-pressed={i === active}>
                  <img src={imgUrl(src)} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="detail-info stack" style={{ gap: 14 }}>
          <div>
            {(product.brand || product.category?.name) && <Link to={product.brand ? `/shop?brand=${encodeURIComponent(product.brand)}` : shopUrl(product.category.slug)} className="eyebrow">{product.brand || product.category.name}</Link>}
            <h1 style={{ fontFamily: 'var(--display)', textTransform: 'uppercase', fontSize: 'clamp(1.9rem, 1.3rem + 2vw, 2.7rem)', lineHeight: 1, margin: '0 0 8px' }}>{product.name}</h1>
            <div className="product-rating-row">
              {product.numReviews > 0 ? <Stars value={product.rating} size={16} showValue count={`${product.numReviews} ratings`} /> : <span className="muted small">No ratings yet</span>}
              <span className="pdp-sku">· SKU {variant?.sku || String(product._id).slice(-8).toUpperCase()}</span>
            </div>
          </div>

          <div className="price-row big">
            <strong>{money(price)}</strong>
            {off > 0 && <><s className="muted">{money(compareAt)}</s><span className="save">Save {money(compareAt - price)} ({off}%)</span></>}
          </div>
          <div>{needsChoice ? <span className="options-hint">Choose {names.join(' & ').toLowerCase()} to see stock</span> : <StockDot stock={stock} />}</div>

          {hasVariants && <VariantPicker product={product} selected={selected} onChange={setSelected} />}

          {!out || needsChoice ? (
            <div className="buy-row">
              <div className="qty" role="group" aria-label="Quantity">
                <button onClick={() => setQty((x) => Math.max(1, x - 1))} aria-label="Decrease quantity" disabled={qty <= 1}><Icon name="minus" size={16} /></button>
                <span aria-live="polite">{qty}</span>
                <button onClick={() => setQty((x) => Math.min(stock || 1, x + 1))} aria-label="Increase quantity" disabled={qty >= stock}><Icon name="plus" size={16} /></button>
              </div>
              <button className="btn btn-primary btn-lg btn-caps" onClick={() => addToCart()}><Icon name="cart" size={18} /> Add to cart</button>
              <button type="button" className={`icon-btn heart-btn-lg ${wish ? 'active' : ''}`} onClick={() => { toggleWishlist(product); toast(wish ? `Removed “${product.name}” from wishlist` : `Saved “${product.name}” to wishlist`); }} aria-label={wish ? 'Remove from wishlist' : 'Save to wishlist'}>
                <Icon name="heart" size={22} className={wish ? 'heart-filled' : ''} />
              </button>
              <button className="btn btn-ghost btn-lg" onClick={() => addToCart(() => navigate('/checkout'))}>Buy now</button>
            </div>
          ) : (
            <div className="alert alert-error"><Icon name="alert" size={18} /> {hasVariants ? 'This option is sold out — try another.' : 'Sold out for now.'} <button className="link-btn" onClick={() => window.dispatchEvent(new CustomEvent('chat:open', { detail: `Something similar to ${product.name}` }))}>Find an alternative</button></div>
          )}

          <CompatibilityChecker product={product} />
          <DeliveryChecker shipping={store.shipping} price={price * qty} />

          <ul className="assure">
            <li><Icon name="truck" size={18} /> Free shipping on orders {money(store.shipping?.freeOver ?? 2000)}+</li>
            <li><Icon name="card" size={18} /> Cash on Delivery, GCash, bank transfer{store.features?.paypal ? ' or PayPal' : ''}</li>
            <li><Icon name="rotate" size={18} /> 30-day returns · PDF invoice with your order</li>
          </ul>
          <button className="btn btn-ghost" onClick={() => window.dispatchEvent(new CustomEvent('chat:open', { detail: `Tell me more about ${product.name}` }))}>
            <Icon name="sparkles" size={16} /> Ask the assistant about this product
          </button>
        </div>
      </div>

      <section className="pdp-tabs card pad">
        <div className="tabs" role="tablist">
          {[['description', 'Description'], ['specs', `Specifications${product.specs?.length ? ` (${product.specs.length})` : ''}`], ['shipping', 'Shipping & returns']].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <div style={{ paddingTop: 16 }}>
          {tab === 'description' && (
            <div className="stack">
              <p className="desc" style={{ margin: 0 }}>{product.description || 'No description yet.'}</p>
              {product.tags?.length > 0 && <div className="compat-chips">{product.tags.map((t) => <Link key={t} to={`/shop?q=${encodeURIComponent(t)}`}><span>#{t}</span></Link>)}</div>}
            </div>
          )}
          {tab === 'specs' && (
            <table className="spec-table">
              <tbody>
                {product.brand && <tr><th>Brand</th><td>{product.brand}</td></tr>}
                {product.category && <tr><th>Category</th><td>{product.category.name}{product.subcategory ? ` › ${product.subcategory}` : ''}</td></tr>}
                {(product.specs || []).map((s) => <tr key={s.label}><th>{s.label}</th><td>{s.value}</td></tr>)}
                {names.map((n) => <tr key={n}><th>{n} options</th><td>{[...new Set(product.variants.map((v) => v.options?.[n]))].join(', ')}</td></tr>)}
                {product.compatibility?.length > 0 && <tr><th>Works with</th><td><div className="compat-chips">{product.compatibility.map((c) => <span key={c}><Icon name="check" size={12} /> {c}</span>)}</div></td></tr>}
              </tbody>
            </table>
          )}
          {tab === 'shipping' && (
            <div className="stack">
              <p style={{ margin: 0 }}><strong>Delivery:</strong> Metro Manila 1–3 business days · rest of Luzon 2–5 · Visayas &amp; Mindanao 3–7. Shipping is {money(store.shipping?.fee ?? 100)}, free on orders of {money(store.shipping?.freeOver ?? 2000)} or more.</p>
              <p style={{ margin: 0 }}><strong>Returns:</strong> {store.returnsPolicy}</p>
              <p style={{ margin: 0 }}><strong>Invoice:</strong> download a PDF invoice for every order from My account → Orders.</p>
            </div>
          )}
        </div>
      </section>

      {pairs.length > 0 && (
        <section className="related">
          <div className="section-head"><h2 className="section-title">Pairs well with</h2>{bundleCoupon && <span className="pill">{bundleCoupon.code}: {bundleCoupon.percent}% off {bundleCoupon.minItems}+ products</span>}</div>
          <div className="pairs">
            <div className="pair-card">
              <img src={imgUrl(variant?.image || product.images?.[0])} alt="" />
              <div><span className="product-name">This item{variant?.label ? ` (${variant.label})` : ''}</span><div className="small"><strong>{money(price)}</strong></div></div>
            </div>
            {pairs.map((p) => (
              <label key={p._id} className="pair-card" style={{ cursor: 'pointer', opacity: pairPicks.includes(p._id) ? 1 : 0.55 }}>
                <img src={imgUrl(p.images?.[0])} alt="" />
                <div>
                  <Link to={`/product/${p.slug}`} className="product-name">{p.name}</Link>
                  <div className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" checked={pairPicks.includes(p._id)} onChange={() => setPairPicks((x) => (x.includes(p._id) ? x.filter((i) => i !== p._id) : [...x, p._id]))} disabled={(p.variants || []).length > 0} aria-label={`Include ${p.name}`} />
                    <strong>{money(p.price)}</strong>{(p.variants || []).length > 0 && <span className="muted">· choose options on its page</span>}
                  </div>
                </div>
              </label>
            ))}
            <div className="pairs-total">
              <span className="muted small">{1 + pairItems.length} items</span>
              <strong style={{ fontSize: '1.3rem' }}>{money(pairTotal)}</strong>
              {bundleCoupon && 1 + pairItems.length >= bundleCoupon.minItems && <span className="ok small">−{bundleCoupon.percent}% with {bundleCoupon.code} at checkout</span>}
              <button className="btn btn-primary" onClick={addPairs} disabled={out && !needsChoice}>Add {1 + pairItems.length} to cart</button>
            </div>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="related">
          <div className="section-head"><h2 className="section-title">You may also like</h2><Link to={shopUrl(product.category?.slug, product.subcategory)} className="see-all-x">More {product.subcategory || product.category?.name} <Icon name="arrow-right" size={14} /></Link></div>
          <div className="grid">{related.map((p) => <ProductCard key={p._id} product={p} />)}</div>
        </section>
      )}

      {(!out || needsChoice) && (
        <div className="buybar" role="region" aria-label="Quick add to cart">
          <div className="buybar-price"><strong>{money(price * qty)}</strong><span className="muted small">{variant?.label || (qty > 1 ? `${qty} × ${money(price)}` : product.name)}</span></div>
          <button className="btn btn-primary btn-lg" onClick={() => addToCart()}><Icon name="cart" size={18} /> Add to cart</button>
        </div>
      )}
      {(!out || needsChoice) && <div className="buybar-space" aria-hidden="true" />}
    </>
  );
}
