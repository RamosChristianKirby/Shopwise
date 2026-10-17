import { useState } from 'react';
import { storage } from '../api.js';
import { money } from '../utils.js';
import Icon from './Icon.jsx';

// Common devices/setups; the product's own list decides the answer.
const DEVICE_GROUPS = [
  ['Phones & tablets', ['iPhone', 'Android', 'iPad']],
  ['Computers', ['Windows PC', 'Mac', 'Linux', 'USB-C laptops']],
  ['Consoles', ['Nintendo Switch', 'PlayStation 5', 'Xbox Series X|S']],
];

/** "Will it work with my device?" — the compatibility checker on the product page. */
export function CompatibilityChecker({ product }) {
  const [device, setDevice] = useState(() => storage.get('myDevice') || '');
  const list = product.compatibility || [];
  if (!list.length) return null;
  const known = new Set(DEVICE_GROUPS.flatMap(([, d]) => d));
  const extra = list.filter((d) => !known.has(d));
  const fits = device ? list.includes(device) : null;

  const choose = (e) => {
    setDevice(e.target.value);
    if (e.target.value) storage.set('myDevice', e.target.value);
  };

  return (
    <div className="check-box">
      <h4><Icon name="plug" size={18} /> Compatibility checker</h4>
      <div className="check-row">
        <select value={device} onChange={choose} aria-label="Your device">
          <option value="">What will you use it with?</option>
          {DEVICE_GROUPS.map(([group, devices]) => (
            <optgroup key={group} label={group}>{devices.map((d) => <option key={d} value={d}>{d}</option>)}</optgroup>
          ))}
          {extra.length > 0 && <optgroup label="Other">{extra.map((d) => <option key={d} value={d}>{d}</option>)}</optgroup>}
        </select>
      </div>
      {fits === true && <div className="check-result yes"><Icon name="check" size={18} strokeWidth={2.5} /><span><strong>Works with {device}.</strong> Tested and supported by the maker.</span></div>}
      {fits === false && (
        <div className="check-result no">
          <Icon name="alert" size={18} />
          <span><strong>Not listed for {device}.</strong> It’s supported on {list.slice(0, 4).join(', ')}{list.length > 4 ? ' and more' : ''}. Ask our assistant for an alternative.</span>
        </div>
      )}
    </div>
  );
}

// Typical delivery times by island group (business days).
const ZONES = [
  { id: 'ncr', label: 'Metro Manila', days: [1, 3], match: /(manila|makati|taguig|pasig|quezon city|qc|mandaluyong|pasay|para[nñ]aque|muntinlupa|las pi[nñ]as|marikina|caloocan|valenzuela|malabon|navotas|san juan|pateros|ncr|metro manila|bgc)/ },
  { id: 'luzon', label: 'Rest of Luzon', days: [2, 5], match: /(cavite|laguna|batangas|rizal|bulacan|pampanga|tarlac|nueva ecija|zambales|bataan|baguio|benguet|pangasinan|ilocos|la union|isabela|cagayan|quezon|bicol|albay|camarines|sorsogon|naga|legazpi|mindoro|palawan|aurora|antipolo|angeles|olongapo|lucena|batangas)/ },
  { id: 'visayas', label: 'Visayas', days: [3, 6], match: /(cebu|iloilo|bacolod|negros|bohol|tacloban|leyte|samar|capiz|aklan|boracay|antique|guimaras|dumaguete|siquijor|roxas)/ },
  { id: 'mindanao', label: 'Mindanao', days: [4, 7], match: /(davao|cagayan de oro|cdo|zamboanga|general santos|gensan|butuan|surigao|bukidnon|cotabato|iligan|misamis|lanao|agusan|sultan kudarat|sarangani|basilan|sulu|tawi)/ },
];

const addBusinessDays = (days) => {
  const d = new Date();
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) left -= 1; // couriers deliver Mon–Sat
  }
  return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
};

/** Delivery estimate by city/province, with the store's free-shipping rule. */
export function DeliveryChecker({ shipping, price = 0 }) {
  const [place, setPlace] = useState(() => storage.get('myCity') || '');
  const [result, setResult] = useState(null);

  const check = (e) => {
    e.preventDefault();
    const q = place.trim().toLowerCase();
    if (!q) return;
    storage.set('myCity', place.trim());
    const zone = ZONES.find((z) => z.match.test(q)) || null;
    setResult(zone || { id: 'unknown' });
  };

  const free = shipping && price >= shipping.freeOver;
  return (
    <form className="check-box" onSubmit={check}>
      <h4><Icon name="truck" size={18} /> Delivery estimate</h4>
      <div className="check-row">
        <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Your city or province, e.g. Cebu City" aria-label="City or province" />
        <button className="btn btn-ghost">Check</button>
      </div>
      {result && result.id !== 'unknown' && (
        <div className="check-result yes">
          <Icon name="calendar" size={18} />
          <span>
            <strong>{result.label}: arrives {addBusinessDays(result.days[0])} – {addBusinessDays(result.days[1])}</strong>
            <br />Cash on Delivery available. {free ? 'Free shipping on this item.' : shipping ? `Shipping ${money(shipping.fee)} — free on orders of ${money(shipping.freeOver)}+.` : ''}
          </span>
        </div>
      )}
      {result?.id === 'unknown' && (
        <div className="check-result info"><Icon name="info" size={18} /><span>We deliver nationwide in about 2–7 business days. Try your city or province name for a closer estimate.</span></div>
      )}
    </form>
  );
}
