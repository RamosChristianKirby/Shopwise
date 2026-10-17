import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { imgUrl } from '../api.js';
import { money } from '../utils.js';
import Icon from './Icon.jsx';
import { useCategories } from '../queries.js';

export default function LiveSearch({ id = 'nav-search', placeholder = 'Search products, brands and more…', onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const [focused, setFocused] = useState(false);
  const { data: categories = [] } = useCategories();
  // "Trending searches" shown when the box is focused and empty: the store's busiest subcategories.
  const trending = categories
    .flatMap((c) => (c.subcategories || []).map((s) => s))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7)
    .map((s) => s.name);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      api
        .get('/products', { params: { q: trimmed, limit: 6 } })
        .then((res) => {
          setResults(res.data?.items || []);
          setOpen(true);
        })
        .catch(() => {
          setResults([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) {
      if (e.key === 'Enter') {
        handleSubmit(e);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        selectProduct(results[selectedIndex]);
      } else {
        handleSubmit(e);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const selectProduct = (product) => {
    setOpen(false);
    setFocused(false);
    setQuery('');
    if (onSelect) onSelect();
    navigate(`/product/${product.slug}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setOpen(false);
    setFocused(false);
    if (onSelect) onSelect();
    navigate(`/shop?q=${encodeURIComponent(trimmed)}`);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="live-search-container" ref={containerRef}>
      <form className="nav-search" onSubmit={handleSubmit} role="search">
        <Icon name="search" size={18} />
        <input
          ref={inputRef}
          id={id}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            setFocused(true);
            if (query.trim().length >= 2 && results.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search products"
          type="search"
          autoComplete="off"
          enterKeyHint="search"
        />
        {query && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={handleClear}
            aria-label="Clear search query"
          >
            <Icon name="x" size={14} />
          </button>
        )}
      </form>

      {focused && !query.trim() && trending.length > 0 && (
        <div className="live-search-dropdown" role="listbox" aria-label="Trending searches">
          <div className="trending">
            <span className="trending-label">Trending searches</span>
            {trending.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setFocused(false);
                  if (onSelect) onSelect();
                  navigate(`/shop?q=${encodeURIComponent(t)}`);
                }}
              >
                <Icon name="trend" size={12} /> {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {open && query.trim().length >= 2 && (
        <div className="live-search-dropdown" role="listbox">
          {loading ? (
            <div className="live-search-loading">
              <span className="live-search-spinner" /> Searching products…
            </div>
          ) : results.length === 0 ? (
            <div className="live-search-empty">
              No products found for “<strong>{query}</strong>”
            </div>
          ) : (
            <>
              <div className="live-search-header">
                Products matching “{query}”
              </div>
              <ul className="live-search-list">
                {results.map((product, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <li
                      key={product._id}
                      className={`live-search-item ${isSelected ? 'selected' : ''}`}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => selectProduct(product)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <img
                        src={imgUrl(product.images?.[0])}
                        alt=""
                        className="live-search-thumb"
                      />
                      <div className="live-search-info">
                        <span className="live-search-name">{product.name}</span>
                        <span className="live-search-meta">
                          {product.category?.name || product.brand || 'Product'}
                        </span>
                      </div>
                      <div className="live-search-price">
                        <strong>{money(product.price)}</strong>
                        {product.compareAtPrice > product.price && (
                          <s className="muted small">{money(product.compareAtPrice)}</s>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                className="live-search-footer"
                onClick={handleSubmit}
              >
                View all results for “{query}” <Icon name="arrow-right" size={14} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
