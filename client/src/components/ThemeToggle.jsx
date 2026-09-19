import { useEffect, useState } from 'react';
import { storage } from '../api.js';
import Icon from './Icon.jsx';

const isDark = (mode) =>
  mode === 'dark' || (mode !== 'light' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches);

/** Light / dark switch. Remembers the choice; defaults to the device setting. */
export default function ThemeToggle({ className = '' }) {
  const [mode, setMode] = useState(() => storage.get('theme') || 'system');
  const dark = isDark(mode);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
  }, [mode]);

  const toggle = () => {
    const next = dark ? 'light' : 'dark';
    storage.set('theme', next);
    setMode(next);
  };

  return (
    <button className={`icon-btn ${className}`} onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>
      <Icon name={dark ? 'sun' : 'moon'} size={20} />
    </button>
  );
}
