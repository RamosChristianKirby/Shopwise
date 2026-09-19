import Icon from './Icon.jsx';

// Text + icon + colour, so a status is never conveyed by colour alone.
const ICONS = { pending: 'clock', processing: 'refresh', shipped: 'truck', delivered: 'check', cancelled: 'x' };

export default function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      <Icon name={ICONS[status] || 'info'} size={12} strokeWidth={2.5} /> {status}
    </span>
  );
}
