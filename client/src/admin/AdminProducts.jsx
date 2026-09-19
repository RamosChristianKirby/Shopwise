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
  name: '', description: '', price: '', compareAtPrice: '', category: '', brand: '',
  stock: '', images: [], isFeatured: false, isActive: true,
};

function ProductForm({ product, categories, onClose, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(
    product
      ? { ...EMPTY, ...product, category: product.category?._id || product.category || '', compareAtPrice: product.compareAtPrice || '' }
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
        brand: form.brand,
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
          <label>Stock<input required type="number" min="0" step="1" value={form.stock} onChange={set('stock')} /></label>
          <label>Brand<input value={form.brand} onChange={set('brand')} /></label>
          <div className="checks">
            <label className="check"><input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} /> Featured on home page</label>
            <label className="check"><input type="checkbox" checked={form.isActive} onChange={set('isActive')} /> Visible in store</label>
          </div>
          <label className="span2">Description<textarea rows="4" value={form.description} onChange={set('description')} /></label>
        </div>

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
  useEffect(() => { api.get('/categories').then((r) => setCategories(list(r.data))).catch(() => {}); }, []);

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
                  <td data-label="Category">{p.category?.name || '—'}</td>
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
