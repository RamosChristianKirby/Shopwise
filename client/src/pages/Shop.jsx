import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useEscape, useScrollLock, useSeo } from '../hooks.js';
import { currencySymbol, money, plural } from '../utils.js';
import { storage } from '../api.js';
import { useCategories, useFacets, useProducts } from '../queries.js';
import Icon from '../components/Icon.jsx';
import ProductCard from '../components/ProductCard.jsx';
import Pagination from '../components/Pagination.jsx';
import { ProductGridSkeleton } from '../components/Skeleton.jsx';
import { Stars } from '../components/ui.jsx';

const SORTS = [
  ['popular', 'Best selling'],
  ['newest', 'Newest'],
  ['rating', 'Top rated'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['name', 'Name'],
];
const csv = (v) => (v ? v.split(',').filter(Boolean) : []);
const toggleIn = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Group({ title, children, defaultOpen = true, count }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`fgroup ${open ? '' : 'closed'}`}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{title}{count ? ` (${count})` : ''}</span><Icon name="chevron-down" size={16} />
      </button>
      <div className="fgroup-body">{children}</div>
    </div>
  );
}

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [sheet, setSheet] = useState(false);
  const [view, setView] = useState(() => storage.get('shopView') || 'grid');

  const p = (k) => params.get(k) || '';
  const q = p('q');
  const category = p('category');
  const subcategory = p('subcategory');
  const brand = p('brand');
  const compat = p('compat');
  const sort = p('sort') || 'popular';
  const page = Number(p('page')) || 1;
  const optParams = Object.fromEntries([...params.entries()].filter(([k]) => k.startsWith('opt_')));

  // Filters that apply at every level of the cascade
  const base = { q, minPrice: p('minPrice'), maxPrice: p('maxPrice'), minRating: p('minRating'), inStock: p('inStock'), onSale: p('onSale') };

  /* ---- cascading facet queries: each level is keyed by (and narrowed by) the levels above it ---- */
  const { data: allCategories = [] } = useCategories();
  const catFacet = useFacets('categories', base);
  const subFacet = useFacets('subcategories', { ...base, category }, { enabled: !!category });
  const brandFacet = useFacets('brands', { ...base, category, subcategory });
  const optFacet = useFacets('options', { ...base, category, subcategory, brand, ...optParams, compat }, { enabled: !!category || !!q });
  const priceFacet = useFacets('price', { ...base, category, subcategory, brand });
  const products = useProducts({ ...base, category, subcategory, brand, compat, ...optParams, sort, page, limit: 12 });

  const data = products.data;
  const activeCategory = allCategories.find((c) => c.slug === category);
  const subs = subFacet.data?.subcategories || [];
  const brands = brandFacet.data?.brands || [];
  const options = optFacet.data?.options || [];
  const compatList = optFacet.data?.compatibility || [];
  const priceBounds = priceFacet.data?.price;

  const [price, setPrice] = useState({ min: p('minPrice'), max: p('maxPrice') });
  useEffect(() => { setPrice({ min: p('minPrice'), max: p('maxPrice') }); }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  useScrollLock(sheet);
  useEscape(sheet, () => setSheet(false));

  /** Updates the URL; parent filters clear the filters that depend on them. */
  const update = (changes) => {
    const next = new URLSearchParams(params);
    const clearDependents = (keys) => keys.forEach((k) => next.delete(k));
    if ('category' in changes) {
      clearDependents(['subcategory', 'brand', 'compat']);
      [...next.keys()].filter((k) => k.startsWith('opt_')).forEach((k) => next.delete(k));
    }
    if ('subcategory' in changes) [...next.keys()].filter((k) => k.startsWith('opt_')).forEach((k) => next.delete(k));
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const chips = useMemo(() => {
    const out = [];
    if (q) out.push({ key: 'q', label: `“${q}”`, clear: { q: '' } });
    if (category) out.push({ key: 'category', label: activeCategory?.name || category, clear: { category: '' } });
    csv(subcategory).forEach((s) => out.push({ key: `sub-${s}`, label: s, clear: { subcategory: csv(subcategory).filter((x) => x !== s).join(',') } }));
    csv(brand).forEach((b) => out.push({ key: `brand-${b}`, label: b, clear: { brand: csv(brand).filter((x) => x !== b).join(',') } }));
    Object.entries(optParams).forEach(([k, v]) => csv(v).forEach((val) => out.push({ key: `${k}-${val}`, label: `${k.slice(4)}: ${val}`, clear: { [k]: csv(v).filter((x) => x !== val).join(',') } })));
    csv(compat).forEach((c) => out.push({ key: `compat-${c}`, label: `Works with ${c}`, clear: { compat: csv(compat).filter((x) => x !== c).join(',') } }));
    if (p('minPrice') || p('maxPrice')) out.push({ key: 'price', label: `${currencySymbol()}${p('minPrice') || 0} – ${p('maxPrice') ? currencySymbol() + p('maxPrice') : 'any'}`, clear: { minPrice: '', maxPrice: '' } });
    if (p('minRating')) out.push({ key: 'rating', label: `${p('minRating')}★ & up`, clear: { minRating: '' } });
    if (p('inStock')) out.push({ key: 'stock', label: 'In stock', clear: { inStock: '' } });
    if (p('onSale')) out.push({ key: 'sale', label: 'On sale', clear: { onSale: '' } });
    return out;
  }, [params, activeCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const title = q ? `Results for “${q}”` : p('onSale') ? 'Deals & sale' : csv(subcategory).length === 1 ? subcategory : activeCategory?.name || 'All products';
  useSeo({
    title,
    description: activeCategory?.description ? `${activeCategory.name}: ${activeCategory.description}. Fast delivery, COD, GCash and bank transfer.` : 'Browse every product. Filter by category, brand, price, rating and more.',
    noindex: !!q,
    jsonLd: data?.items?.length
      ? { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: data.items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, url: `${window.location.origin}/product/${it.slug}`, name: it.name })) }
      : null,
  });

  const fetching = products.isFetching || catFacet.isFetching || subFacet.isFetching || brandFacet.isFetching;
  const setViewMode = (v) => { setView(v); storage.set('shopView', v); };

  return (
    <>
      <div className="shop-banner">
        <div>
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link><Icon name="chevron-right" size={14} />
            <Link to="/shop">Shop</Link>
            {activeCategory && <><Icon name="chevron-right" size={14} /><Link to={`/shop?category=${activeCategory.slug}`}>{activeCategory.name}</Link></>}
            {csv(subcategory).length === 1 && <><Icon name="chevron-right" size={14} /><span>{subcategory}</span></>}
          </nav>
          <h1 className="page-title">{title}</h1>
          {activeCategory?.description && !q && <p>{activeCategory.description}.</p>}
        </div>
        <span className="muted small" style={{ color: '#c9d6ec' }}>{data ? plural(data.total, 'product') : ' '}</span>
      </div>

      {category && subs.length > 0 && (
        <div className="sub-pills" role="toolbar" aria-label="Subcategories">
          <button className={`sub-pill ${!subcategory ? 'active' : ''}`} onClick={() => update({ subcategory: '' })}>All {activeCategory?.name} <em>{catFacet.data?.categories?.find((c) => c.slug === category)?.count ?? ''}</em></button>
          {subs.map((s) => (
            <button key={s.value} className={`sub-pill ${csv(subcategory).includes(s.value) ? 'active' : ''}`} onClick={() => update({ subcategory: csv(subcategory).length === 1 && subcategory === s.value ? '' : s.value })}>
              {s.value} <em>{s.count}</em>
            </button>
          ))}
        </div>
      )}

      <div className="shop-layout">
        {sheet && <div className="scrim" onClick={() => setSheet(false)} />}
        <aside className={`filters card ${sheet ? 'open' : ''}`} aria-label="Filters">
          <div className="filters-head">
            <h3>Filters</h3>
            <button className="icon-btn" aria-label="Close filters" onClick={() => setSheet(false)}><Icon name="x" size={20} /></button>
          </div>
          <div className="filters-body">
            <Group title="Department">
              <label className="fcheck"><input type="radio" name="cat" checked={!category} onChange={() => update({ category: '' })} /><span>All departments</span></label>
              {(catFacet.data?.categories || allCategories.map((c) => ({ ...c, count: c.productCount }))).map((c) => (
                <label key={c._id} className={`fcheck ${c.count === 0 && category !== c.slug ? 'disabled' : ''}`}>
                  <input type="radio" name="cat" checked={category === c.slug} onChange={() => update({ category: c.slug })} />
                  <span>{c.name}</span><em>{c.count}</em>
                </label>
              ))}
            </Group>

            {category && (
              <Group title="Type" count={csv(subcategory).length || undefined}>
                {subFacet.isLoading ? <div className="loading-bar" /> : subs.map((s) => (
                  <label key={s.value} className="fcheck">
                    <input type="checkbox" checked={csv(subcategory).includes(s.value)} onChange={() => update({ subcategory: toggleIn(csv(subcategory), s.value).join(',') })} />
                    <span>{s.value}</span><em>{s.count}</em>
                  </label>
                ))}
              </Group>
            )}

            {brands.length > 0 && (
              <Group title="Brand" count={csv(brand).length || undefined}>
                {brands.map((b) => (
                  <label key={b.value} className="fcheck">
                    <input type="checkbox" checked={csv(brand).includes(b.value)} onChange={() => update({ brand: toggleIn(csv(brand), b.value).join(',') })} />
                    <span>{b.value}</span><em>{b.count}</em>
                  </label>
                ))}
              </Group>
            )}

            {options.map((o) => {
              const key = `opt_${o.name}`;
              const chosen = csv(p(key));
              return (
                <Group key={o.name} title={o.name} count={chosen.length || undefined}>
                  <div className="swatch-row">
                    {o.values.map((v) => (
                      <button key={v.value} type="button" className={`fchip ${chosen.includes(v.value) ? 'active' : ''}`} onClick={() => update({ [key]: toggleIn(chosen, v.value).join(',') })} title={`${v.count} products`}>
                        {v.value}
                      </button>
                    ))}
                  </div>
                </Group>
              );
            })}

            {compatList.length > 0 && (
              <Group title="Works with" count={csv(compat).length || undefined}>
                {compatList.map((c) => (
                  <label key={c.value} className="fcheck">
                    <input type="checkbox" checked={csv(compat).includes(c.value)} onChange={() => update({ compat: toggleIn(csv(compat), c.value).join(',') })} />
                    <span>{c.value}</span><em>{c.count}</em>
                  </label>
                ))}
              </Group>
            )}

            <Group title={`Price (${currencySymbol()})`}>
              <form className="price-filter" onSubmit={(e) => { e.preventDefault(); update({ minPrice: price.min, maxPrice: price.max }); setSheet(false); }}>
                <input type="number" min="0" inputMode="numeric" placeholder={priceBounds ? String(priceBounds.min) : 'Min'} value={price.min} onChange={(e) => setPrice({ ...price, min: e.target.value })} aria-label="Minimum price" />
                <span aria-hidden="true">–</span>
                <input type="number" min="0" inputMode="numeric" placeholder={priceBounds ? String(priceBounds.max) : 'Max'} value={price.max} onChange={(e) => setPrice({ ...price, max: e.target.value })} aria-label="Maximum price" />
                <button className="btn btn-ghost btn-sm" type="submit">Go</button>
              </form>
              <div className="swatch-row" style={{ marginTop: 6 }}>
                {[[0, 500], [500, 1500], [1500, 3000], [3000, '']].map(([lo, hi]) => (
                  <button key={`${lo}-${hi}`} type="button" className={`fchip ${p('minPrice') === String(lo || '') && p('maxPrice') === String(hi) ? 'active' : ''}`} onClick={() => update({ minPrice: lo ? String(lo) : '', maxPrice: String(hi) })}>
                    {hi ? `${lo ? money(lo).replace(/\.00$/, '') : 'Under'} ${lo ? '–' : ''} ${money(hi).replace(/\.00$/, '')}` : `${money(lo).replace(/\.00$/, '')}+`}
                  </button>
                ))}
              </div>
            </Group>

            <Group title="Customer rating">
              {[4.5, 4, 3].map((r) => (
                <label key={r} className="fcheck">
                  <input type="radio" name="rating" checked={p('minRating') === String(r)} onChange={() => update({ minRating: String(r) })} />
                  <span><Stars value={r} size={13} /> &amp; up</span>
                </label>
              ))}
              {p('minRating') && <button className="link-btn small" onClick={() => update({ minRating: '' })}>Any rating</button>}
            </Group>

            <Group title="Availability">
              <label className="fcheck"><input type="checkbox" checked={!!p('inStock')} onChange={(e) => update({ inStock: e.target.checked ? 'true' : '' })} /><span>In stock only</span></label>
              <label className="fcheck"><input type="checkbox" checked={!!p('onSale')} onChange={(e) => update({ onSale: e.target.checked ? 'true' : '' })} /><span>On sale</span></label>
            </Group>

            {chips.length > 0 && <button className="link-btn" onClick={() => { setParams({}); setSheet(false); }}>Clear all filters</button>}
          </div>
          <div className="filters-foot">
            <button className="btn btn-primary btn-block" onClick={() => setSheet(false)}>
              {data ? `Show ${plural(data.total, 'product')}` : 'Show products'}
            </button>
          </div>
        </aside>

        <section className="shop-main">
          <div className="toolbar">
            <span className="muted small">{data ? `Showing ${data.items.length ? (data.page - 1) * 12 + 1 : 0}–${(data.page - 1) * 12 + data.items.length} of ${data.total}` : ' '}</span>
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
              <div className="view-toggle" role="group" aria-label="Layout">
                <button className={view === 'grid' ? 'active' : ''} aria-pressed={view === 'grid'} onClick={() => setViewMode('grid')} aria-label="Grid view"><Icon name="grid" size={16} /></button>
                <button className={view === 'list' ? 'active' : ''} aria-pressed={view === 'list'} onClick={() => setViewMode('list')} aria-label="List view"><Icon name="list" size={16} /></button>
              </div>
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

          <div style={{ height: 3 }}>{fetching && data && <div className="loading-bar" />}</div>

          {products.isError && <div className="alert alert-error"><Icon name="alert" size={18} /> Could not load products. Please try again.</div>}
          {!data && !products.isError && <ProductGridSkeleton count={8} />}
          {data && data.items.length === 0 && (
            <div className="empty card">
              <div className="empty-icon"><Icon name="search" size={26} /></div>
              <h3>No products found</h3>
              <p className="muted">Try removing a filter, or ask our assistant to find something similar.</p>
              <div className="btn-row" style={{ justifyContent: 'center' }}>
                {chips.length > 0 && <button className="btn btn-primary" onClick={() => setParams({})}>Clear filters</button>}
                <button className="btn btn-ghost" onClick={() => window.dispatchEvent(new CustomEvent('chat:open', { detail: q ? `I'm looking for ${q}` : '' }))}><Icon name="chat" size={16} /> Ask the assistant</button>
              </div>
            </div>
          )}
          {data && data.items.length > 0 && (
            <>
              <div className={`grid ${view === 'list' ? 'list-view' : ''}`} style={{ opacity: products.isPlaceholderData ? 0.6 : 1, transition: 'opacity .2s' }}>
                {data.items.map((item) => <ProductCard key={item._id} product={item} />)}
              </div>
              <Pagination page={data.page} pages={data.pages} onChange={(pg) => { update({ page: String(pg) }); window.scrollTo({ top: 0 }); }} />
            </>
          )}
        </section>
      </div>
    </>
  );
}
