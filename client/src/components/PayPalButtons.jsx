import { useEffect, useRef, useState } from 'react';
import api, { errMsg } from '../api.js';
import Icon from './Icon.jsx';

const loaded = new Map();
function loadSdk(clientId, currency) {
  const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture&components=buttons`;
  if (!loaded.has(src)) {
    loaded.set(
      src,
      new Promise((resolve, reject) => {
        document.querySelectorAll('script[data-paypal-sdk]').forEach((s) => s.remove());
        delete window.paypal;
        const s = document.createElement('script');
        s.src = src;
        s.dataset.paypalSdk = '1';
        s.onload = () => resolve(window.paypal);
        s.onerror = () => { loaded.delete(src); reject(new Error('Could not load PayPal. Check your connection or ad blocker.')); };
        document.head.appendChild(s);
      })
    );
  }
  return loaded.get(src);
}

/**
 * PayPal Smart Buttons. The server creates and captures the PayPal order, so amounts
 * can't be changed in the browser.
 *   createUrl  → POST returns { id }      captureUrl → POST { paypalOrderId } returns the updated record
 */
export default function PayPalButtons({ clientId, currency = 'PHP', createUrl, captureUrl, onPaid }) {
  const ref = useRef(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let buttons;
    setError('');
    loadSdk(clientId, currency)
      .then((paypal) => {
        if (cancelled || !ref.current || !paypal?.Buttons) return;
        ref.current.innerHTML = '';
        buttons = paypal.Buttons({
          style: { layout: 'vertical', shape: 'rect', label: 'pay' },
          createOrder: () => api.post(createUrl).then((r) => r.data.id),
          onApprove: (data) => api.post(captureUrl, { paypalOrderId: data.orderID }).then((r) => onPaid?.(r.data)).catch((e) => setError(errMsg(e))),
          onError: (e) => setError(e?.message || 'PayPal could not complete the payment. Please try again.'),
        });
        return buttons.render(ref.current).then(() => !cancelled && setReady(true));
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
      try { buttons?.close?.(); } catch { /* ignore */ }
    };
  }, [clientId, currency, createUrl, captureUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="stack" style={{ gap: 8 }}>
      {!ready && !error && <div className="skeleton" style={{ height: 48 }} aria-label="Loading PayPal" />}
      <div ref={ref} />
      {error && <div className="alert alert-error"><Icon name="alert" size={18} /> {error}</div>}
    </div>
  );
}
