// Placeholder shapes shown while data loads (feels faster and avoids layout jumps).
export const Skeleton = ({ className = '', style }) => <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid" role="status" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <div className="card product-card" key={i} aria-hidden="true">
          <Skeleton className="sk-img" />
          <div className="product-info">
            <Skeleton className="sk-line short" />
            <Skeleton className="sk-line" />
            <Skeleton className="sk-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="stack" role="status" aria-label="Loading">
      <Skeleton className="sk-line" style={{ width: '40%', height: 28 }} />
      <Skeleton style={{ height: 220, borderRadius: 16 }} />
      <Skeleton className="sk-line" />
      <Skeleton className="sk-line short" />
    </div>
  );
}
