export default function Spinner({ full = false }) {
  return (
    <div className={full ? 'spinner-wrap full' : 'spinner-wrap'} role="status" aria-label="Loading">
      <div className="spinner" />
    </div>
  );
}
