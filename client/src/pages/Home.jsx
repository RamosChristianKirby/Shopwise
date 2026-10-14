import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { imgUrl } from '../api.js';
import { STORE } from '../config.js';
import { useTitle } from '../hooks.js';
import { list, money } from '../utils.js';
import { useToast } from '../context/ToastContext.jsx';
import Icon from '../components/Icon.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { ProductGridSkeleton } from '../components/Skeleton.jsx';

const PERKS = [
  { icon: 'truck', title: 'Free shipping', text: 'On qualifying orders' },
  { icon: 'card', title: 'Pay your way', text: 'COD, GCash or bank transfer' },
  { icon: 'package', title: 'Easy tracking', text: 'Follow every order in your account' },
  { icon: 'shield', title: 'Shop with confidence', text: 'Secure accounts, clear order history' },
];

const REVIEWS = [
  {
    name: 'Sarah M.',
    rating: 5,
    date: '2 days ago',
    title: 'Super fast delivery and great quality!',
    comment: 'The wireless headphones arrived in 2 days and the sound quality is incredible for the price.',
    product: 'Wireless Noise-Cancelling Headphones',
  },
  {
    name: 'David L.',
    rating: 5,
    date: '1 week ago',
    title: 'Smooth shopping experience',
    comment: 'Paid with GCash and was confirmed right away. The mechanical keyboard feels amazing to type on.',
    product: 'Mechanical Keyboard 75%',
  },
  {
    name: 'Elena R.',
    rating: 5,
    date: '2 weeks ago',
    title: 'Exceeded my expectations',
    comment: 'The soy candle and facial serum are now my daily staples. Packed with care and free shipping!',
    product: 'Scented Soy Candle',
  },
];

export default function Home() {
  useTitle('');
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [latest, setLatest] = useState(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(list(r.data))).catch(() => {});
    api.get('/products', { params: { featured: true, limit: 4, sort: 'popular' } }).then((r) => setFeatured(list(r.data?.items))).catch(() => setFeatured([]));
    api.get('/products', { params: { limit: 8, sort: 'newest' } }).then((r) => setLatest(list(r.data?.items))).catch(() => setLatest([]));
  }, []);

  const showcase = list(featured).filter((p) => p.images?.length).slice(0, 3);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    toast('🎉 Thank you! Your 10% coupon code is WELCOME10');
    setEmail('');
  };

  return (
    <div className="sections">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">New season, new finds</span>
          <h1>Good things for everyday living.</h1>
          <p>{STORE.tagline} Electronics, fashion, home and beauty — all in one place.</p>
          <div className="hero-actions">
            <Link to="/shop" className="btn btn-primary btn-lg">Shop now <Icon name="arrow-right" size={18} /></Link>
            <Link to="/shop?sort=price-asc" className="btn btn-ghost btn-lg">Best prices</Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          {showcase.length >= 2 ? (
            showcase.map((p, i) => (
              <div key={p._id} className={`hero-tile t${i + 1}`}>
                <img src={imgUrl(p.images[0])} alt="" />
                <span>{money(p.price)}</span>
              </div>
            ))
          ) : (
            <>
              <div className="hero-blob b1" /><div className="hero-blob b2" /><div className="hero-blob b3" />
            </>
          )}
        </div>
      </section>

      <section className="perks" aria-label="Why shop with us">
        {PERKS.map((p) => (
          <div key={p.title} className="perk">
            <span className="perk-icon"><Icon name={p.icon} size={20} /></span>
            <div><strong>{p.title}</strong><span className="muted small">{p.text}</span></div>
          </div>
        ))}
      </section>

      {categories.length > 0 && (
        <section>
          <div className="section-head"><h2 className="section-title">Shop by category</h2></div>
          <div className="cat-grid">
            {categories.map((c) => (
              <Link key={c._id} to={`/shop?category=${c.slug}`} className="card cat-tile">
                <span className="cat-icon"><Icon name="tag" size={18} /></span>
                <span className="grow">
                  <strong>{c.name}</strong>
                  <span className="muted small">{c.productCount} product{c.productCount === 1 ? '' : 's'}</span>
                </span>
                <Icon name="chevron-right" size={18} className="muted" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {(featured === null || featured.length > 0) && (
        <section>
          <div className="section-head">
            <h2 className="section-title">Featured</h2>
            <Link to="/shop?sort=popular" className="see-all">Best sellers <Icon name="arrow-right" size={16} /></Link>
          </div>
          {featured === null ? <ProductGridSkeleton count={4} /> : <div className="grid">{featured.map((p) => <ProductCard key={p._id} product={p} />)}</div>}
        </section>
      )}

      <section>
        <div className="section-head">
          <h2 className="section-title">New arrivals</h2>
          <Link to="/shop" className="see-all">View all <Icon name="arrow-right" size={16} /></Link>
        </div>
        {latest === null ? <ProductGridSkeleton count={8} /> : latest.length === 0 ? (
          <div className="empty card"><h3>No products yet</h3><p className="muted">Products you add in the admin panel will show up here.</p></div>
        ) : (
          <div className="grid">{latest.map((p) => <ProductCard key={p._id} product={p} />)}</div>
        )}
      </section>

      {/* Customer Reviews Section */}
      <section>
        <div className="section-head">
          <h2 className="section-title">What our customers say</h2>
        </div>
        <div className="reviews-grid">
          {REVIEWS.map((r, i) => (
            <div key={i} className="card review-card">
              <div className="review-head">
                <span className="review-author">{r.name}</span>
                <div className="review-stars" aria-label={`${r.rating} stars`}>
                  {[...Array(r.rating)].map((_, idx) => (
                    <Icon key={idx} name="star" size={14} className="star-gold" />
                  ))}
                </div>
              </div>
              <h3 className="review-title">{r.title}</h3>
              <p className="review-comment">“{r.comment}”</p>
              <div className="review-product">Verified purchase: {r.product}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Exclusive Newsletter & Promo Banner */}
      <section className="promo-banner card">
        <div className="promo-content">
          <span className="eyebrow">Exclusive Offer</span>
          <h2>Get 10% off your first order</h2>
          <p className="muted">Subscribe to our newsletter for exclusive drops, early sale access, and member-only promotions.</p>
          <form className="promo-form" onSubmit={handleSubscribe}>
            <input
              type="email"
              placeholder="Enter your email address…"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-label="Email address for discount"
            />
            <button className="btn btn-primary">Subscribe</button>
          </form>
        </div>
      </section>
    </div>
  );
}
