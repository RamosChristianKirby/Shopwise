import { useCallback, useEffect, useRef, useState } from 'react';
import { API_IS_EXTERNAL, API_URL } from '../config.js';
import Icon from './Icon.jsx';

/** Works out whether the API answers, and why not if it doesn't. Returns null when all is well. */
async function diagnose() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${API_URL}/health`, { signal: ctrl.signal, cache: 'no-store', headers: { Accept: 'application/json' } });
    const type = res.headers.get('content-type') || '';
    if (res.status === 200 && type.includes('text/html')) {
      return {
        title: 'That address is a website, not an API',
        text: `${API_URL} returned a web page. Check API_URL in config.js — it usually needs to end with /api (for example ${API_URL.replace(/\/+$/, '')}/api).`,
      };
    }
    if (res.status >= 500) {
      return {
        title: 'The API is not responding',
        text: API_IS_EXTERNAL
          ? `${API_URL} answered with an error (${res.status}). Check that your API is running correctly.`
          : `The shop server is not running or crashed (${res.status}). Start it with "npm start" (or "npm run dev") and refresh.`,
      };
    }
    return null; // any normal answer (even a 404 for /health) means the API is reachable
  } catch (e) {
    if (API_IS_EXTERNAL) {
      return {
        title: `Can’t reach your API`,
        text: `Nothing answered at ${API_URL}. Check that it is running, that the address in config.js is right, and that it allows requests from ${window.location.origin} (CORS).`,
      };
    }
    return {
      title: 'The shop server is not running',
      text: 'The website could not reach its API. Start it with "npm start" (or "npm run dev") and refresh this page.',
    };
  } finally {
    clearTimeout(timer);
  }
}

export default function ApiStatus() {
  const [issue, setIssue] = useState(null);
  const [busy, setBusy] = useState(false);
  const last = useRef(0);

  const check = useCallback(async () => {
    setBusy(true);
    const result = await diagnose();
    last.current = Date.now();
    setIssue(result);
    setBusy(false);
  }, []);

  useEffect(() => {
    check();
    // a failed request anywhere in the app -> re-check (at most every 5 seconds)
    const onOffline = () => { if (Date.now() - last.current > 5000) check(); };
    window.addEventListener('api:offline', onOffline);
    window.addEventListener('online', check);
    return () => {
      window.removeEventListener('api:offline', onOffline);
      window.removeEventListener('online', check);
    };
  }, [check]);

  // while there's a problem, keep checking so the banner clears itself
  useEffect(() => {
    if (!issue) return undefined;
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, [issue, check]);

  if (!issue) return null;
  return (
    <div className="api-banner" role="alert">
      <div className="container api-banner-inner">
        <Icon name="wifi-off" size={18} />
        <p>
          <strong>{issue.title}.</strong> <span>{issue.text}</span>
        </p>
        <button className="btn btn-sm api-retry" onClick={check} disabled={busy}>
          <Icon name="refresh" size={14} /> {busy ? 'Checking…' : 'Retry'}
        </button>
      </div>
    </div>
  );
}
