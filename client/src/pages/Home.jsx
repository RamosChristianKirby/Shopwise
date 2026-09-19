import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { imgUrl } from '../api.js';
import { STORE } from '../config.js';
import { useTitle } from '../hooks.js';
import { list, money } from '../utils.js';
import Icon from '../components/Icon.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { ProductGridSkeleton } from '../components/Skeleton.jsx';

const PERKS = [
  { icon: 'truck', title: 'Free shipping', text: 'On qualifying orders' },
  { icon: 'card', title: 'Pay your way', text: 'COD, GCash or bank transfer' },
  { icon: 'package', title: 'Easy tracking', text: 'Follow every order in your account' },
  { icon: 'shield', title: 'Shop with confidence', text: 'Secure accounts, clear order history' },
];

export default function Home() {
  useTitle('');
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [latest, setLatest] = useState(null);

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(list(r.data))).catch(() => {});
    api.get('/products', { params: { featured: true, limit: 4, sort: 'popular' } }).then((r) => setFeatured(list(r.data?.items))).catch(() => setFeatured([]));
    api.get('/products', { params: { limit: 8, sort: 'newest' } }).then((r) => setLatest(list(r.data?.items))).catch(() => setLatest([]));
  }, []);

  const showcase = list(featured).filter((p) => p.images?.length).slice(0, 3);

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
    </div>
  );
}
