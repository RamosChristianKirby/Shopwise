import { useEffect, useState } from 'react';
import api, { errMsg } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import { list } from '../utils.js';
import { useTitle } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import Spinner from '../components/Spinner.jsx';

export default function AdminCategories() {
  useTitle('Categories');
  const { toast } = useToast();
  const [cats, setCats] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editId, setEditId] = useState(null);

  const load = () => api.get('/categories').then((r) => setCats(list(r.data))).catch((e) => toast(errMsg(e), 'error'));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editId) await api.put(`/admin/categories/${editId}`, form);
      else await api.post('/admin/categories', form);
      toast(editId ? 'Category updated' : 'Category added');
      setForm({ name: '', description: '' });
      setEditId(null);
      load();
    } catch (err) { toast(errMsg(err), 'error'); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete category “${c.name}”?`)) return;
    try { await api.delete(`/admin/categories/${c._id}`); toast('Category deleted'); load(); } catch (err) { toast(errMsg(err), 'error'); }
  };

  return (
    <>
      <div className="page-head"><h1 className="page-title">Categories</h1></div>
      <div className="two-col even">
        <form className="card pad stack" onSubmit={save}>
          <h3>{editId ? 'Edit category' : 'Add category'}</h3>
          <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Description<textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <div className="modal-actions left">
            <button className="btn btn-primary">{editId ? 'Save' : 'Add category'}</button>
            {editId && <button type="button" className="btn btn-ghost" onClick={() => { setEditId(null); setForm({ name: '', description: '' }); }}>Cancel</button>}
          </div>
        </form>

        {!cats ? <Spinner /> : (
          <div className="card table-wrap">
            <table className="rt">
              <thead><tr><th>Name</th><th className="num">Products</th><th /></tr></thead>
              <tbody>
                {cats.map((c) => (
                  <tr key={c._id}>
                    <td data-label="Name" className="cell-main"><strong>{c.name}</strong><div className="muted small">/{c.slug}</div></td>
                    <td className="num" data-label="Products">{c.productCount}</td>
                    <td className="actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditId(c._id); setForm({ name: c.name, description: c.description || '' }); }}><Icon name="edit" size={14} /> Edit</button>
                      <button className="btn btn-danger-ghost btn-sm" onClick={() => remove(c)}><Icon name="trash" size={14} /> Delete</button>
                    </td>
                  </tr>
                ))}
                {cats.length === 0 && <tr className="row-empty"><td colSpan="3" className="muted">No categories yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
