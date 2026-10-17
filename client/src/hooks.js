import { useEffect, useState } from 'react';
import { STORE } from './config.js';
import { useStore } from './context/StoreContext.jsx';

/** Sets the browser tab title, e.g. useTitle('Cart') -> "Cart · Shopwise". */
export function useTitle(title) {
  const ctx = useStore();
  const name = ctx?.store?.name || STORE.name;
  useEffect(() => {
    document.title = title ? `${title} · ${name}` : name;
  }, [title, name]);
}

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!content) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Per-page SEO while browsing (the server injects the same tags on first load):
 * title, description, canonical, Open Graph and JSON-LD structured data.
 */
export function useSeo({ title, description, image, canonical, jsonLd, noindex = false } = {}) {
  useTitle(title);
  const ld = jsonLd ? JSON.stringify(jsonLd) : '';
  useEffect(() => {
    if (description) setMeta('name', 'description', description);
    setMeta('property', 'og:title', title || document.title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:image', image);
    setMeta('name', 'robots', noindex ? 'noindex' : '');
    let link = document.head.querySelector('link[rel="canonical"]');
    const href = canonical || `${window.location.origin}${window.location.pathname}`;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = href;
    document.head.querySelectorAll('script[data-seo]').forEach((s) => s.remove());
    if (ld) {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.dataset.seo = '1';
      s.textContent = ld;
      document.head.appendChild(s);
    }
    return () => {
      document.head.querySelectorAll('script[data-seo]').forEach((s) => s.remove());
    };
  }, [title, description, image, canonical, ld, noindex]);
}

/** Locks page scroll while an overlay (drawer, modal, sheet) is open. */
export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [active]);
}

/** Calls onEscape when Escape is pressed while active. */
export function useEscape(active, onEscape) {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onEscape(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, onEscape]);
}

/** Time left until the end of today (local time) — drives the "deal ends in" countdowns. */
export function useCountdown() {
  const calc = () => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const ms = Math.max(0, end - now);
    return { h: Math.floor(ms / 3.6e6), m: Math.floor((ms % 3.6e6) / 6e4), s: Math.floor((ms % 6e4) / 1000) };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

/** Debounced copy of a value (for search-as-you-type). */
export function useDebounced(value, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}
