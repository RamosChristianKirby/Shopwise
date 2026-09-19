import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import api, { errMsg, imgUrl } from '../api.js';
import { fmtDate, list, money, moneyShort, STATUSES } from '../utils.js';
import { useTitle } from '../hooks.js';
import Icon from '../components/Icon.jsx';
import Spinner from '../components/Spinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const RANGES = [
  { days: 7, label: '7D' },
  { days: 30, label: '30D' },
  { days: 90, label: '90D' },
  { days: 365, label: '12M' },
];

// "2026-09-12" or "2026-09" -> Date in local time (avoids UTC off-by-one)
const parseKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d || 1);
};
const tickLabel = (interval) => (k) =>
  parseKey(k).toLocaleDateString('en-US', interval === 'month' ? { month: 'short', year: '2-digit' } : { month: 'short', day: 'numeric' });
const fullLabel = (interval) => (k) =>
  parseKey(k).toLocaleDateString('en-US', interval === 'month' ? { month: 'long', year: 'numeric' } : { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

function Delta({ value }) {
  if (value === undefined || value === null) return null;
  const up = value >= 0;
  return (
    <span className={`delta ${up ? 'up' : 'down'}`}>
      <Icon name="trend" size={12} strokeWidth={2.5} className={up ? '' : 'flip'} /> {Math.abs(value).toFixed(1)}%
      <span className="visually-hidden">{up ? ' increase' : ' decrease'}</span>
    </span>
  );
}

function Kpi({ label, value, sub, delta, icon }) {
  return (
    <div className="card kpi">
      <span className="kpi-label"><span className="kpi-icon"><Icon name={icon} size={16} /></span><span className="muted small">{label}</span></span>
      <strong className="kpi-value">{value}</strong>
      <span className="kpi-sub">{delta !== undefined && <Delta value={delta} />} <span className="muted small">{sub}</span></span>
    </div>
  );
}

function ChartTooltip({ active, payload, label, interval, kind }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="chart-tip">
      <div className="muted small">{fullLabel(interval)(label)}</div>
      <strong>{kind === 'revenue' ? money(v) : `${v} order${v === 1 ? '' : 's'}`}</strong>
    </div>
  );
}

const axisProps = {
  tick: { fill: 'var(--text-muted)', fontSize: 12 },
  axisLine: false,
  tickLine: false,
};

export default function Dashboard() {
  useTitle('Dashboard');
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState(null);
  const [sales, setSales] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('chart');

  useEffect(() => {
    api.get('/admin/analytics/summary').then((r) => setSummary(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  useEffect(() => {
    setSales(null);
    api.get('/admin/analytics/sales', { params: { days } }).then((r) => setSales(r.data)).catch((e) => setError(errMsg(e)));
  }, [days]);

  if (error) return <div className="alert alert-error"><Icon name="alert" size={18} /> {error}</div>;
  if (!summary) return <Spinner />;

  const { last30Days: m, today, allTime, statusCounts } = summary;
  const recentOrders = list(summary.recentOrders);
  const lowStock = list(summary.lowStock);
  const series = list(sales?.series);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <span className="muted small">Overview of your store’s sales. Cancelled orders are excluded.</span>
        </div>
      </div>

      <section className="kpi-grid" aria-label="Key figures">
        <Kpi icon="trend" label="Revenue · last 30 days" value={money(m.revenue)} delta={m.revenueChange} sub="vs previous 30 days" />
        <Kpi icon="list" label="Orders · last 30 days" value={m.orders.toLocaleString()} delta={m.ordersChange} sub="vs previous 30 days" />
        <Kpi icon="card" label="Average order value" value={money(m.avgOrderValue)} sub="last 30 days" />
        <Kpi icon="clock" label="Today" value={money(today.revenue)} sub={`${today.orders} order${today.orders === 1 ? '' : 's'}`} />
      </section>

      <section className="card chart-card">
        <div className="chart-head">
          <div>
            <h2>Revenue</h2>
            {sales && (
              <span className="muted small">
                {money(sales.totalRevenue)} from {sales.totalOrders.toLocaleString()} orders · avg {money(sales.avgOrderValue)}
              </span>
            )}
          </div>
          <div className="chart-controls">
            <div className="segmented" role="group" aria-label="Time range">
              {RANGES.map((r) => (
                <button key={r.days} className={days === r.days ? 'active' : ''} aria-pressed={days === r.days} onClick={() => setDays(r.days)}>{r.label}</button>
              ))}
            </div>
            <div className="segmented" role="group" aria-label="View">
              <button className={view === 'chart' ? 'active' : ''} aria-pressed={view === 'chart'} onClick={() => setView('chart')}>Chart</button>
              <button className={view === 'table' ? 'active' : ''} aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</button>
            </div>
          </div>
        </div>

        {!sales ? <Spinner /> : view === 'chart' ? (
          <>
            <div className="chart-box" role="img" aria-label={`Revenue over the last ${days} days`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" style={{ stopColor: 'var(--series-1)', stopOpacity: 0.22 }} />
                      <stop offset="100%" style={{ stopColor: 'var(--series-1)', stopOpacity: 0 }} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--grid)" />
                  <XAxis dataKey="date" {...axisProps} tickFormatter={tickLabel(sales.interval)} minTickGap={28} />
                  <YAxis {...axisProps} width={48} tickFormatter={moneyShort} domain={[0, (max) => (max > 0 ? Math.ceil(max) : 100)]} />
                  <Tooltip content={<ChartTooltip interval={sales.interval} kind="revenue" />} cursor={{ stroke: 'var(--text-muted)', strokeDasharray: '3 3' }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--series-1)"
                    strokeWidth={2}
                    fill="url(#revFill)"
                    dot={false}
                    activeDot={{ r: 5, fill: 'var(--series-1)', stroke: 'var(--surface)', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <h2 className="chart-sub">Orders</h2>
            <div className="chart-box short" role="img" aria-label={`Orders per ${sales.interval} over the last ${days} days`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--grid)" />
                  <XAxis dataKey="date" {...axisProps} tickFormatter={tickLabel(sales.interval)} minTickGap={28} />
                  <YAxis {...axisProps} width={34} allowDecimals={false} domain={[0, (max) => Math.max(max, 4)]} />
                  <Tooltip content={<ChartTooltip interval={sales.interval} kind="orders" />} cursor={{ fill: 'var(--hover)' }} />
                  <Bar dataKey="orders" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="table-wrap scroll-y">
            <table className="rt">
              <thead><tr><th>{sales.interval === 'month' ? 'Month' : 'Date'}</th><th className="num">Orders</th><th className="num">Revenue</th></tr></thead>
              <tbody>
                {[...series].reverse().map((p) => (
                  <tr key={p.date}><td data-label={sales.interval === 'month' ? 'Month' : 'Date'}>{fullLabel(sales.interval)(p.date)}</td><td className="num" data-label="Orders">{p.orders}</td><td className="num" data-label="Revenue">{money(p.revenue)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card pad">
        <div className="chart-head">
          <h2>Order pipeline</h2>
          <span className="muted small">{summary.customers} customers · {summary.products} active products · {money(allTime.revenue)} all-time</span>
        </div>
        <div className="pipeline">
          {STATUSES.map((s) => (
            <Link key={s} to={`/admin/orders?status=${s}`} className="pipe">
              <strong>{statusCounts[s]}</strong>
              <StatusBadge status={s} />
            </Link>
          ))}
        </div>
      </section>

      <div className="two-col even">
        <section className="card pad">
          <div className="chart-head"><h2>Recent orders</h2><Link to="/admin/orders" className="muted small">View all →</Link></div>
          {recentOrders.length === 0 ? <p className="muted">No orders yet — they will show up here as customers check out.</p> : (
          <div className="table-wrap flush">
            <table>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o._id}>
                    <td><strong>{o.orderNumber}</strong><div className="muted small">{o.user?.name || 'Deleted user'} · {fmtDate(o.createdAt)}</div></td>
                    <td className="num">{money(o.totalPrice)}</td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </section>

        <section className="card pad">
          <div className="chart-head"><h2>Low stock</h2><Link to="/admin/products?lowStock=true" className="muted small">Manage →</Link></div>
          {lowStock.length === 0 ? <p className="muted">All products are well stocked.</p> : (
            <ul className="plain-list">
              {lowStock.map((p) => (
                <li key={p._id}>
                  <img src={imgUrl(p.images?.[0])} alt="" className="thumb" />
                  <span className="grow">{p.name}</span>
                  <span className={`stock-pill ${p.stock === 0 ? 'zero' : ''}`}>{p.stock === 0 ? 'Out of stock' : `${p.stock} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
