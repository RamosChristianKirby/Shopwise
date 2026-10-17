import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api, { errMsg, imgUrl } from '../api.js';
import { money } from '../utils.js';
import { useStore } from '../context/StoreContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Icon from './Icon.jsx';

const KEY = 'chat:history';
const loadHistory = () => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(-30) : [];
  } catch {
    return [];
  }
};

/** **bold** → <strong>, keeps everything else as text (no HTML injection). */
function Rich({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>));
}

/** Floating "Chat with us" assistant: product search, recommendations, shipping/returns answers and order tracking. */
export default function ChatWidget() {
  const { store } = useStore();
  const { add } = useCart();
  const { toast } = useToast();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadHistory);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const botName = store.chatbotName || 'Wise';

  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(messages.slice(-30))); } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    if (open) {
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [open, messages, busy]);

  // Other parts of the site can open the chat with a question: window.dispatchEvent(new CustomEvent('chat:open', { detail: 'text' }))
  useEffect(() => {
    const onOpen = (e) => {
      setOpen(true);
      if (typeof e.detail === 'string' && e.detail) send(e.detail);
    };
    window.addEventListener('chat:open', onOpen);
    return () => window.removeEventListener('chat:open', onOpen);
  });

  if (/^\/(admin|checkout)/.test(pathname)) return null;

  async function send(text) {
    const content = String(text || '').trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const { data } = await api.post('/chat', {
        messages: next.map(({ role, content: c }) => ({ role, content: c })).slice(-12),
        page: pathname,
      });
      setMessages((m) => [...m, { role: 'assistant', content: data.reply || '…', products: data.products || [], suggestions: data.suggestions || [], ai: !!data.ai }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: errMsg(e), error: true }]);
    } finally {
      setBusy(false);
    }
  }

  const greeting = {
    role: 'assistant',
    content: `Hi! I’m ${botName}, the ${store.name} shopping assistant. I can find products for your budget, compare options, check stock, and answer shipping, payment and order questions.`,
    suggestions: ['Best sellers', 'Gift ideas under ₱1,500', 'Shipping times', 'Track my order'],
  };
  const shown = messages.length ? messages : [greeting];
  const last = shown[shown.length - 1];

  if (!open) {
    return (
      <button className="chat-fab" onClick={() => setOpen(true)} aria-label={`Chat with ${botName}, our shopping assistant`}>
        <span className="chat-fab-dot"><Icon name="chat" size={18} /></span>
        <span>Chat with us</span>
      </button>
    );
  }

  return (
    <section className="chat-panel" role="dialog" aria-label={`${botName} shopping assistant`}>
      <header className="chat-head">
        <span className="chat-fab-dot"><Icon name="sparkles" size={18} /></span>
        <div>
          <strong>{botName}</strong>
          <small>{store.features?.aiChat ? 'AI shopping assistant · replies instantly' : 'Shopping assistant · replies instantly'}</small>
        </div>
        {messages.length > 0 && (
          <button className="icon-btn" title="Start over" aria-label="Clear conversation" onClick={() => setMessages([])}><Icon name="refresh" size={18} /></button>
        )}
        <button className="icon-btn" style={{ marginLeft: 0 }} aria-label="Close chat" onClick={() => setOpen(false)}><Icon name="x" size={20} /></button>
      </header>

      <div className="chat-body" ref={bodyRef} aria-live="polite">
        {shown.map((m, i) => (
          <div key={i} style={{ display: 'contents' }}>
            <div className={`chat-msg ${m.role === 'user' ? 'user' : 'bot'}`}><Rich text={m.content} /></div>
            {m.products?.length > 0 && (
              <div className="chat-cards">
                {m.products.map((p) => (
                  <Link key={p._id} to={`/product/${p.slug}`} className="chat-card" onClick={() => window.innerWidth < 520 && setOpen(false)}>
                    <img src={imgUrl(p.images?.[0])} alt="" />
                    <div>
                      <strong>{p.name}</strong>
                      <span>{money(p.price)}{p.compareAtPrice > p.price ? ` · was ${money(p.compareAtPrice)}` : ''}{p.stock > 0 ? '' : ' · sold out'}</span>
                    </div>
                    {!p.hasOptions && p.stock > 0 ? (
                      <button
                        className="icon-btn"
                        aria-label={`Add ${p.name} to cart`}
                        onClick={(e) => { e.preventDefault(); add(p, 1, false); toast(`Added “${p.name}” to your cart`); }}
                      >
                        <Icon name="plus" size={16} />
                      </button>
                    ) : <Icon name="chevron-right" size={16} />}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="chat-msg bot chat-typing" aria-label="Typing"><i /><i /><i /></div>}
        {!busy && last.role === 'assistant' && last.suggestions?.length > 0 && (
          <div className="chat-suggest">
            {last.suggestions.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}
          </div>
        )}
      </div>

      <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about products, sizes, delivery…" aria-label="Message" maxLength={600} />
        <button className="btn btn-primary" disabled={busy || !input.trim()} aria-label="Send"><Icon name="send" size={16} /></button>
      </form>
      <div className="chat-foot">{store.features?.aiChat ? 'AI answers can make mistakes — prices and stock are confirmed at checkout.' : 'Prices and stock are confirmed at checkout.'}</div>
    </section>
  );
}
