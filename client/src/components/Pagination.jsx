import Icon from './Icon.jsx';

export default function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  const nums = [];
  for (let p = 1; p <= pages; p += 1) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <nav className="pagination" aria-label="Pagination">
      <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <Icon name="chevron-left" size={16} /> <span className="hide-xs">Prev</span>
      </button>
      {nums.map((n, i) =>
        n === '…' ? (
          <span key={`e${i}`} className="muted">…</span>
        ) : (
          <button
            key={n}
            className={`btn btn-sm page-num ${n === page ? 'btn-primary' : 'btn-ghost'}`}
            aria-current={n === page ? 'page' : undefined}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        )
      )}
      <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <span className="hide-xs">Next</span> <Icon name="chevron-right" size={16} />
      </button>
    </nav>
  );
}
