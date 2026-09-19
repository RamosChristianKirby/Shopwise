import { useState } from 'react';
import Icon from './Icon.jsx';

/** Password input with a show/hide button. */
export default function PasswordField({ label, hint, value, onChange, autoComplete, minLength, required = true }) {
  const [show, setShow] = useState(false);
  return (
    <label>
      <span>{label} {hint && <span className="muted small">{hint}</span>}</span>
      <span className="input-wrap">
        <input type={show ? 'text' : 'password'} required={required} minLength={minLength} autoComplete={autoComplete} value={value} onChange={onChange} />
        <button type="button" className="input-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
          <Icon name={show ? 'eye-off' : 'eye'} size={18} />
        </button>
      </span>
    </label>
  );
}
