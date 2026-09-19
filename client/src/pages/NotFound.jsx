import { Link } from 'react-router-dom';
import { useTitle } from '../hooks.js';

export default function NotFound() {
  useTitle('Page not found');
  return (
    <div className="empty card">
      <div className="big-404" aria-hidden="true">404</div>
      <h1>Page not found</h1>
      <p className="muted">We couldn’t find the page you were looking for.</p>
      <Link to="/" className="btn btn-primary btn-lg">Back to home</Link>
    </div>
  );
}
