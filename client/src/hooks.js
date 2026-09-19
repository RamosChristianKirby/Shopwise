import { useEffect } from 'react';
import { STORE } from './config.js';

/** Sets the browser tab title, e.g. useTitle('Cart') -> "Cart · Shopwise". */
export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${STORE.name}` : STORE.name;
  }, [title]);
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
