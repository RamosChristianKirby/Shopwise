// Small shared storefront pieces.
import { useCountdown } from '../hooks.js';
import Icon from './Icon.jsx';

export function Stars({ value = 0, size = 14, count, showValue = false }) {
  const full = Math.round(Number(value) || 0);
  return (
    <span className="stars-row" aria-label={`Rated ${Number(value || 0).toFixed(1)} out of 5`}>
      <span className="stars" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={size} className={i <= full ? '' : 'star-empty'} />)}
      </span>
      {showValue && <strong>{Number(value || 0).toFixed(1)}</strong>}
      {count !== undefined && <span>({count})</span>}
    </span>
  );
}

export function Countdown({ label }) {
  const { h, m, s } = useCountdown();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <span className="countdown" role="timer" aria-label={`${label || 'Ends in'} ${h} hours ${m} minutes`}>
      {label && <em style={{ fontStyle: 'normal', marginRight: 2 }}>{label}</em>}
      <span>{pad(h)}h</span><span>{pad(m)}m</span><span>{pad(s)}s</span>
    </span>
  );
}

export function StockDot({ stock }) {
  if (!(stock > 0)) return <span className="stock-dot out">Sold out</span>;
  if (stock <= 5) return <span className="stock-dot low">Only {stock} left</span>;
  return <span className="stock-dot">In stock</span>;
}
