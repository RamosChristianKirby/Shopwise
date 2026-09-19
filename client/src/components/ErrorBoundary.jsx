import { Component } from 'react';

/**
 * Catches any error thrown while rendering, so a bug (or unexpected data from the API)
 * shows a friendly message instead of a blank white/dark page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[Shopwise] UI error:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const detail = String(error?.stack || error?.message || error).split('\n').slice(0, 6).join('\n');
    return (
      <div className={this.props.inline ? 'crash crash-inline' : 'crash'} role="alert">
        <div className="crash-card">
          <div className="crash-icon" aria-hidden="true">!</div>
          <h1>Something went wrong</h1>
          <p className="muted">
            This page hit an unexpected problem. Your cart and login are safe. Try again, or reload the page.
          </p>
          <div className="btn-row crash-actions">
            <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>Try again</button>
            <button className="btn btn-ghost" onClick={() => window.location.reload()}>Reload page</button>
            <a className="btn btn-ghost" href="/">Go to home</a>
          </div>
          <details className="crash-detail">
            <summary>Technical details</summary>
            <pre>{detail}</pre>
          </details>
        </div>
      </div>
    );
  }
}
