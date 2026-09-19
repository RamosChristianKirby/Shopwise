import { Link } from 'react-router-dom';
import { imgUrl } from '../api.js';
import { money } from '../utils.js';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Icon from './Icon.jsx';

export default function ProductCard({ product }) {
  const { add } = useCart();
  const { toast } = useToast();
  const out = !(product.stock > 0);
  const onSale = product.compareAtPrice > product.price;
  const off = onSale ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0;
  const href = `/product/${product.slug}`;

  return (
    <article className="card product-card">
      <Link to={href} className="product-img" tabIndex={-1} aria-hidden="true">
        <img src={imgUrl(product.images?.[0])} alt="" loading="lazy" width="400" height="400" />
        {onSale && !out && <span className="tag tag-sale">-{off}%</span>}
        {out && <span className="tag tag-out">Sold out</span>}
      </Link>
      <div className="product-info">
        <span className="product-cat">{product.category?.name || ' '}</span>
        <Link to={href} className="product-name">{product.name}</Link>
        <div className="price-row">
          <strong>{money(product.price)}</strong>
          {onSale && <s className="muted small">{money(product.compareAtPrice)}</s>}
        </div>
        <button
          className="btn btn-primary btn-block add-btn"
          disabled={out}
          onClick={() => {
            add(product, 1);
            toast(`Added “${product.name}” to your cart`);
          }}
        >
          <Icon name={out ? 'x' : 'cart'} size={16} /> {out ? 'Out of stock' : 'Add to cart'}
        </button>
      </div>
    </article>
  );
}
