import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api.js';
import { useEscape, useScrollLock, useTitle } from '../hooks.js';
import { currencySymbol, list } from '../utils.js';
import Icon from '../components/Icon.jsx';
import ProductCard from '../components/ProductCard.jsx';
import Pagination from '../components/Pagination.jsx';
import { ProductGridSkeleton } from '../components/Skeleton.jsx';

const SORTS = [
  ['newest', 'Newest'],
  ['popular', 'Best selling'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['name', 'Name'],
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState(false);

  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'newest';
  const minPrice = params.get('minPrice') || '';
  const maxPrice = params.get('maxPrice') || '';
  const page = Number(params.get('page')) || 1;

  useTitle(q ? `Results for “${q}”` : 'Shop');
  useScrollLock(sheet);
  useEscape(sheet, () => setSheet(false));

  const [price, setPrice] = useState({ min: minPrice, max: maxPrice });
  useEffect(() => {
    setPrice({ min: minPrice, max: maxPrice });
  }, [minPrice, maxPrice]);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(list(r.data))).catch(() => {});
  }, []);

  useEffect(() => {
    setData(null);
    setError('');
    api
      .get('/products', { params: { q, category, sort, minPrice, maxPrice, page, limit: 12 } })
      .then((r) => setData({ ...r.data, items: list(r.data?.items) }))
      .catch(() => setError('Could not load products. Please try again.'));
  }, [q, category, sort, minPrice, maxPrice, page]);

  const activeCategory = categories.find((c) => c.slug === category);
  const chips = [
    q && { key: 'q', label: `“${q}”`, clear: { q: '' } },
    category && { key: 'category', label: activeCategory?.name || category, clear: { category: '' } },
    (minPrice || maxPrice) && {
      key: 'price',
      label: `${currencySymbol()}${minPrice || 0} – ${maxPrice ? currencySymbol() + maxPrice : 'any'}`,
      clear: { minPrice: '', maxPrice: '' },
    },
  ].filter(Boolean);

  return (
    <div className="shop-layout">
      {sheet && <div className="scrim" onClick={() => setSheet(false)} />}
      <aside className={`filters card ${sheet ? 'open' : ''}`} aria-label="Filters">
        <div className="filters-head">
          <h3>Filters</h3>
          <button className="icon-btn" aria-label="Close filters" onClick={() => setSheet(false)}><Icon name="x" size={20} /></button>
        </div>
        <div className="filters-body">
          <h4>Categories</h4>
          <ul className="filter-list">
            <li><button className={!category ? 'active' : ''} onClick={() => { update({ category: '' }); setSheet(false); }}>All products</button></li>
            {categories.map((c) => (
              <li key={c._id}>
                <button className={category === c.slug ? 'active' : ''} onClick={() => { update({ category: c.slug }); setSheet(false); }}>
                  <span>{c.name}</span> <span className="muted small">{c.productCount}</span>
                </button>
              </li>
            ))}
          </ul>

          <h4>Price ({currencySymbol()})</h4>
          <form
            className="price-filter"
            onSubmit={(e) => {
              e.preventDefault();
              update({ minPrice: price.min, maxPrice: price.max });
              setSheet(false);
            }}
          >
            <input type="number" min="0" inputMode="numeric" placeholder="Min" value={price.min} onChange={(e) => setPrice({ ...price, min: e.target.value })} aria-label="Minimum price" />
            <span aria-hidden="true">–</span>
            <input type="number" min="0" inputMode="numeric" placeholder="Max" value={price.max} onChange={(e) => setPrice({ ...price, max: e.target.value })} aria-label="Maximum price" />
            <button className="btn btn-ghost btn-sm" type="submit">Apply</button>
          </form>

          {chips.length > 0 && <button className="link-btn" onClick={() => { setParams({}); setSheet(false); }}>Clear all filters</button>}
        </div>
        <div className="filters-foot">
          <button className="btn btn-primary btn-block" onClick={() => setSheet(false)}>
            {data ? `Show ${data.total} product${data.total === 1 ? '' : 's'}` : 'Show products'}
          </button>
        </div>
      </aside>

      <section className="shop-main">
        <div className="toolbar">
          <div>
            <h1 className="page-title">{q ? `Results for “${q}”` : activeCategory?.name || 'Shop'}</h1>
            <span className="muted small">{data ? `${data.total} product${data.total === 1 ? '' : 's'}` : ' '}</span>
          </div>
          <div className="toolbar-controls">
            <button className="btn btn-ghost filters-toggle" onClick={() => setSheet(true)}>
              <Icon name="sliders" size={16} /> Filters {chips.length > 0 && <span className="cart-count">{chips.length}</span>}
            </button>
            <label className="sort">
              <span className="muted small">Sort by</span>
              <select value={sort} onChange={(e) => update({ sort: e.target.value })}>
                {SORTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </label>
          </div>
        </div>

        {chips.length > 0 && (
          <div className="chips" aria-label="Active filters">
            {chips.map((c) => (
              <button key={c.key} className="chip" onClick={() => update(c.clear)} aria-label={`Remove filter ${c.label}`}>
                {c.label} <Icon name="x" size={12} strokeWidth={2.5} />
              </button>
            ))}
          </div>
        )}

        {error && <div className="alert alert-error"><Icon name="alert" size={18} /> {error}</div>}
        {!data && !error && <ProductGridSkeleton count={8} />}
        {data && data.items.length === 0 && (
          <div className="empty card">
            <div className="empty-icon"><Icon name="search" size={26} /></div>
            <h3>No products found</h3>
            <p className="muted">Try a different search or clear your filters.</p>
            {chips.length > 0 && <button className="btn btn-primary" onClick={() => setParams({})}>Clear filters</button>}
          </div>
        )}
        {data && data.items.length > 0 && (
          <>
            <div className="grid">{data.items.map((p) => <ProductCard key={p._id} product={p} />)}</div>
            <Pagination page={data.page} pages={data.pages} onChange={(p) => { update({ page: String(p) }); window.scrollTo({ top: 0 }); }} />
          </>
        )}
      </section>
    </div>
  );
}
