import { useEffect, useRef } from 'react';
import { useEscape, useScrollLock } from '../hooks.js';
import Icon from './Icon.jsx';

/** Centered dialog on desktop, full-height sheet on phones. */
export default function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useScrollLock(true);
  useEscape(true, onClose);

  useEffect(() => {
    const el = ref.current;
    if (el) el.focus();
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} tabIndex={-1} className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
