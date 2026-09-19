import { STORE } from '../config.js';
import { Brand } from './StoreLayout.jsx';
import Icon from './Icon.jsx';

/** Two-column layout for log in / sign up: a benefits panel (desktop only) next to the form. */
export default function AuthShell({ children }) {
  return (
    <div className="auth-layout">
      <aside className="auth-aside">
        <Brand />
        <h2>Shop smarter with {STORE.name}</h2>
        <ul>
          <li><Icon name="package" size={18} /> Track every order from checkout to delivery</li>
          <li><Icon name="truck" size={18} /> Save your address for faster checkout</li>
          <li><Icon name="card" size={18} /> Pay by Cash on Delivery, GCash or bank transfer</li>
        </ul>
      </aside>
      <div className="auth card pad">{children}</div>
    </div>
  );
}
