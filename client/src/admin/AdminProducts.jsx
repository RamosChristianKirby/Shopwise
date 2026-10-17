import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errMsg, imgUrl } from '../api.js';
import { list, money } from '../utils.js';
import { useTitle } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';

const EMPTY = {
  name: '', description: '', price: '', compareAtPrice: '', category: '', subcategory: '', brand: '',
  stock: '', images: [], isFeatured: false, isActive: true, tags: '', compatibility: '', specs: [], optionNames: [], variants: [],
};

const combos = (names, valuesByName) =>
  names.reduce((acc, n) => acc.flatMap((c) => (valuesByName[n] || []).map((v) => ({ ...c, [n]: v }))), [{}]).filter((c) => Object.keys(c).length === names.length);

/** Options (e.g. Color × Size) and one row per combination with its own stock, SKU and optional price. */
function VariantsEditor({ form, setForm }) {
  const names = form.optionNames;
  const valuesOf = (n) => [...new Set(form.variants.map((v) => v.options?.[n]).filter(Boolean))];
  const [draft, setDraft] = useState(() => Object.fromEntries(names.map((n) => [n, valuesOf(n).join(', ')])));
  const [nameInput, setNameInput] = useState(names.join(', '));

  const generate = () => {
    const nextNames = nameInput.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 3);
    const values = Object.fromEntries(nextNames.map((n) => [n, (draft[n] || '').split(',').map((x) => x.trim()).filter(Boolean)]));
    const rows = combos(nextNames, values).map((options) => {
      const existing = form.variants.find((v) => nextNames.every((n) => v.options?.[n] === options[n]));
      return existing ? { ...existing, options } : { options, sku: '', price: '', stock: 0, image: '' };
    });
    setForm((f) => ({ ...f, optionNames: nextNames, variants: rows }));
  };
  const setRow = (i, k, v) => setForm((f) => ({ ...f, variants: f.variants.map((row, j) => (j === i ? { ...row, [k]: v } : row)) }));

  return (
    <div className="stack" style={{ gap: 10 }}>
      <label>Option names <span className="hint">— comma separated, up to 3 (e.g. Color, Size). Leave empty for a simple product.</span>
        <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Color, Size" />
      </label>
      {nameInput.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 3).map((n) => (
        <label key={n}>{n} values <span className="hint">— comma separated</span>
          <input value={draft[n] || ''} onChange={(e) => setDraft({ ...draft, [n]: e.target.value })} placeholder={n.toLowerCase() === 'size' ? 'S, M, L, XL' : 'Black, White'} />
        </label>
      ))}
      <div className="btn-row">
        <button type="button" className="btn btn-ghost btn-sm" onClick={generate}><Icon name="layers" size={14} /> {form.variants.length ? 'Update combinations' : 'Create combinations'}</button>
        {form.variants.length > 0 && <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => { setForm((f) => ({ ...f, optionNames: [], variants: [] })); setNameInput(''); setDraft({}); }}>Remove options</button>}
      </div>
      {form.variants.length > 0 && (
        <div className="table-wrap">
          <table className="variant-table">
            <thead><tr><th>Option</th><th>SKU</th><th>Price override</th><th>Stock</th></tr></thead>
            <tbody>
              {form.variants.map((v, i) => (
                <tr key={form.optionNames.map((n) => v.options?.[n]).join('/')}>
                  <td><strong>{form.optionNames.map((n) => v.options?.[n]).join(' / ')}</strong></td>
                  <td><input value={v.sku || ''} onChange={(e) => setRow(i, 'sku', e.target.value)} aria-label="SKU" /></td>
                  <td><input type="number" min="0" step="0.01" value={v.price ?? ''} placeholder="—" onChange={(e) => setRow(i, 'price', e.target.value)} aria-label="Price" /></td>
                  <td><input type="number" min="0" step="1" value={v.stock ?? 0} onChange={(e) => setRow(i, 'stock', e.target.value)} aria-label="Stock" style={{ width: 90 }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint">Total stock: {form.variants.reduce((n, v) => n + (Number(v.stock) || 0), 0)} (the product’s stock is the sum of its options).</p>
        </div>
      )}
    </div>
  );
}

function ProductForm({ product, categories, onClose, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(
    product
      ? {
        ...EMPTY,
        ...product,
        category: product.category?._id || product.category || '',
        compareAtPrice: product.compareAtPrice || '',
        tags: (product.tags || []).join(', '),
        compatibility: (product.compatibility || []).join(', '),
        specs: product.specs || [],
        optionNames: product.optionNames || [],
        variants: product.variants || [],
      }
      : { ...EMPTY, category: categories[0]?._id || '' }
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const upload = async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('images', f));
      const { data } = await api.post('/admin/upload', fd);
      setForm((f) => ({ ...f, images: [...f.images, ...data.urls] }));
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        compareAtPrice: Number(form.compareAtPrice) || 0,
        category: form.category,
        subcategory: form.subcategory,
        brand: form.brand,
        tags: form.tags,
        compatibility: form.compatibility,
        specs: form.specs.filter((x) => x.label && x.value),
        optionNames: form.optionNames,
        variants: form.variants,
        stock: Number(form.stock) || 0,
        images: form.images,
        isFeatured: form.isFeatured,
        isActive: form.isActive,
      };
      if (product) await api.put(`/admin/products/${product._id}`, payload);
      else await api.post('/admin/products', payload);
      toast(product ? 'Product updated' : 'Product created');
      onSaved();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={product ? 'Edit product' : 'New product'} onClose={onClose} wide>
      <form className="stack" onSubmit={submit}>
        <div className="form-grid">
          <label className="span2">Name<input required value={form.name} onChange={set('name')} /></label>
          <label>Price (₱)<input required type="number" min="0" step="0.01" value={form.price} onChange={set('price')} /></label>
          <label>Compare-at price (₱)
            <input type="number" min="0" step="0.01" placeholder="Optional — shows a sale tag" value={form.compareAtPrice} onChange={set('compareAtPrice')} />
          </label>
          <label>Category
            <select required value={form.category} onChange={set('category')}>
              <option value="" disabled>Select…</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </label>
          <label>Subcategory <span className="hint">(mega menu & filters)</span><input value={form.subcategory} onChange={set('subcategory')} placeholder="e.g. Headphones & Earbuds" /></label>
          <label>Stock{form.variants.length > 0 && <span className="hint"> — set per option below</span>}<input required type="number" min="0" step="1" value={form.variants.length ? form.variants.reduce((n, v) => n + (Number(v.stock) || 0), 0) : form.stock} onChange={set('stock')} disabled={form.variants.length > 0} /></label>
          <label>Brand<input value={form.brand} onChange={set('brand')} /></label>
          <label>Tags <span className="hint">(comma separated, used by search & the assistant)</span><input value={form.tags} onChange={set('tags')} placeholder="bluetooth, travel, gift" /></label>
          <label className="span2">Works with <span className="hint">(compatibility checker — comma separated)</span><input value={form.compatibility} onChange={set('compatibility')} placeholder="iPhone, Android, Windows PC, Mac" /></label>
          <div className="checks">
            <label className="check"><input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} /> Featured on home page</label>
            <label className="check"><input type="checkbox" checked={form.isActive} onChange={set('isActive')} /> Visible in store</label>
          </div>
          <label className="span2">Description<textarea rows="4" value={form.description} onChange={set('description')} /></label>
        </div>

        <details className="faq" open={form.specs.length > 0}>
          <summary>Specifications ({form.specs.length})</summary>
          <div className="stack" style={{ gap: 6 }}>
            {form.specs.map((sp, i) => (
              <div className="kv-row" key={i}>
                <input placeholder="Label (e.g. Battery)" value={sp.label} onChange={(e) => setForm({ ...form, specs: form.specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                <input placeholder="Value (e.g. 30 hours)" value={sp.value} onChange={(e) => setForm({ ...form, specs: form.specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} />
                <button type="button" className="icon-btn" aria-label="Remove spec" onClick={() => setForm({ ...form, specs: form.specs.filter((_, j) => j !== i) })}><Icon name="x" size={14} /></button>
              </div>
            ))}
            <div><button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, specs: [...form.specs, { label: '', value: '' }] })}><Icon name="plus" size={14} /> Add spec</button></div>
          </div>
        </details>

        <details className="faq" open={form.variants.length > 0}>
          <summary>Options &amp; variants ({form.variants.length})</summary>
          <div><VariantsEditor form={form} setForm={setForm} /></div>
        </details>

        <div>
          <span className="label">Images <span className="muted small">(the first image is the main one)</span></span>
          <div className="img-list">
            {form.images.map((src, i) => (
              <div className="img-item" key={src + i}>
                <img src={imgUrl(src)} alt="" />
                <button type="button" className="icon-btn" aria-label="Remove image" onClick={() => setForm({ ...form, images: form.images.filter((_, j) => j !== i) })}><Icon name="x" size={12} strokeWidth={3} /></button>
              </div>
            ))}
            <label className="img-add">
              <span><Icon name="upload" size={18} /><br />{uploading ? 'Uploading…' : 'Upload'}</span>
              <input type="file" accept="image/*" multiple hidden onChange={upload} disabled={uploading} />
            </label>
          </div>
          <div className="inline-form">
            <input placeholder="…or paste an image URL" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Image URL" />
            <button type="button" className="btn btn-ghost btn-sm" disabled={!url.trim()} onClick={() => { setForm({ ...form, images: [...form.images, url.trim()] }); setUrl(''); }}>Add</button>
          </div>
        </div>

        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || uploading}>{busy ? 'Saving…' : 'Save product'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminProducts() {
  useTitle('Products');
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | product
  const [search, setSearch] = useState(params.get('q') || '');

  const q = params.get('q') || '';
  const lowStock = params.get('lowStock') === 'true';
  const page = Number(params.get('page')) || 1;

  const load = useCallback(() => {
    api.get('/admin/products', { params: { q, lowStock: lowStock || undefined, page, limit: 10, sort: 'newest' } })
      .then((r) => setData({ ...r.data, items: list(r.data?.items) }))
      .catch((e) => toast(errMsg(e), 'error'));
  }, [q, lowStock, page, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/admin/categories').then((r) => setCategories(list(r.data))).catch(() => {}); }, []);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete “${p.name}”? Past orders keep their details.`)) return;
    try { await api.delete(`/admin/products/${p._id}`); toast('Product deleted'); load(); } catch (e) { toast(errMsg(e), 'error'); }
  };

  const toggleActive = async (p) => {
    try { await api.put(`/admin/products/${p._id}`, { isActive: !p.isActive }); load(); } catch (e) { toast(errMsg(e), 'error'); }
  };

  return (
    <>
      <div className="page-head">
        <div><h1 className="page-title">Products</h1><span className="muted small">{data ? `${data.total} total` : ''}</span></div>
        <button className="btn btn-primary" onClick={() => setEditing('new')} disabled={categories.length === 0} title={categories.length === 0 ? 'Create a category first' : ''}><Icon name="plus" size={16} /> Add product</button>
      </div>

      <div className="toolbar">
        <form className="inline-form" onSubmit={(e) => { e.preventDefault(); update({ q: search.trim() }); }}>
          <input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" />
          <button className="btn btn-ghost btn-sm">Search</button>
        </form>
        <label className="check"><input type="checkbox" checked={lowStock} onChange={(e) => update({ lowStock: e.target.checked ? 'true' : '' })} /> Low stock only (5 or fewer)</label>
      </div>

      {!data ? <Spinner /> : data.items.length === 0 ? (
        <div className="empty card"><h3>No products found</h3></div>
      ) : (
        <div className="card table-wrap">
          <table className="rt">
            <thead><tr><th>Product</th><th>Category</th><th className="num">Price</th><th className="num">Stock</th><th className="num">Sold</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p._id}>
                  <td data-label="Product" className="cell-main">
                    <div className="cell-product">
                      <img src={imgUrl(p.images?.[0])} alt="" className="thumb" />
                      <div><strong>{p.name}</strong>{p.isFeatured && <span className="pill">Featured</span>}</div>
                    </div>
                  </td>
                  <td data-label="Category">{p.category?.name || '—'}{p.subcategory && <div className="muted small">{p.subcategory}</div>}{p.variants?.length > 0 && <div className="muted small">{p.variants.length} options</div>}</td>
                  <td className="num" data-label="Price">{money(p.price)}</td>
                  <td className="num" data-label="Stock"><span className={`stock-pill ${p.stock === 0 ? 'zero' : p.stock <= 5 ? 'low' : ''}`}>{p.stock}</span></td>
                  <td className="num" data-label="Sold">{p.sold}</td>
                  <td data-label="Status">
                    <button className={`switch ${p.isActive ? 'on' : ''}`} role="switch" aria-checked={p.isActive} onClick={() => toggleActive(p)} title={p.isActive ? 'Visible in store' : 'Hidden'}>
                      <span /> <em>{p.isActive ? 'Active' : 'Hidden'}</em>
                    </button>
                  </td>
                  <td className="actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(p)}><Icon name="edit" size={14} /> Edit</button>
                    <button className="btn btn-danger-ghost btn-sm" onClick={() => remove(p)}><Icon name="trash" size={14} /> Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={(p) => update({ page: String(p) })} />}

      {editing && (
        <ProductForm
          product={editing === 'new' ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </>
  );
}
