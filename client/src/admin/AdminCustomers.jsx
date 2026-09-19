import { useCallback, useEffect, useState } from 'react';
import api, { errMsg } from '../api.js';
import { fmtDate, list, money } from '../utils.js';
import { useTitle } from '../hooks.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';

export default function AdminCustomers() {
  useTitle('Customers');
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    api.get('/admin/users', { params: { q, page, limit: 12 } }).then((r) => setData({ ...r.data, items: list(r.data?.items) })).catch((e) => toast(errMsg(e), 'error'));
  }, [q, page, toast]);
  useEffect(() => { load(); }, [load]);

  const patch = async (u, body, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try { await api.put(`/admin/users/${u._id}`, body); toast('User updated'); load(); } catch (e) { toast(errMsg(e), 'error'); }
  };

  return (
    <>
      <div className="page-head"><div><h1 className="page-title">Customers</h1><span className="muted small">{data ? `${data.total} accounts` : ''}</span></div></div>
      <div className="toolbar">
        <form className="inline-form" onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(search.trim()); }}>
          <input placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search customers" />
          <button className="btn btn-ghost btn-sm">Search</button>
        </form>
      </div>

      {!data ? <Spinner /> : (
        <div className="card table-wrap">
          <table className="rt">
            <thead><tr><th>Customer</th><th>Joined</th><th className="num">Orders</th><th className="num">Spent</th><th>Role</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u._id}>
                  <td data-label="Customer" className="cell-main"><strong>{u.name}</strong><div className="muted small">{u.email}</div></td>
                  <td data-label="Joined">{fmtDate(u.createdAt)}</td>
                  <td className="num" data-label="Orders">{u.orders}</td>
                  <td className="num" data-label="Spent">{money(u.spent)}</td>
                  <td data-label="Role">{u.role === 'admin' ? <span className="pill">Admin</span> : 'Customer'}</td>
                  <td data-label="Status">{u.isActive ? <span className="ok">Active</span> : <span className="warn">Disabled</span>}</td>
                  <td className="actions">
                    {u._id !== me._id && (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={() => patch(u, { isActive: !u.isActive }, u.isActive ? `Disable ${u.name}? They won’t be able to log in.` : '')}>
                          {u.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => patch(u, { role: u.role === 'admin' ? 'customer' : 'admin' }, `${u.role === 'admin' ? 'Remove admin access from' : 'Make admin:'} ${u.name}?`)}>
                          {u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && <tr className="row-empty"><td colSpan="7" className="muted">No customers found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </>
  );
}
