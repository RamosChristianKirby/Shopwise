import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { imgUrl } from '../api.js';
import { useTitle } from '../hooks.js';
import { list, money } from '../utils.js';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Icon from '../components/Icon.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { PageSkeleton } from '../components/Skeleton.jsx';

export default function ProductDetail() {
  const { slug } = useParams();
  const { add } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);

  useTitle(data?.product?.name || 'Product');

  useEffect(() => {
    setData(null);
    setError('');
    setActive(0);
    setQty(1);
    api
      .get(`/products/${slug}`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.status === 404 ? 'This product could not be found.' : 'Could not load this product.'));
  }, [slug]);

  if (error) {
    return (
      <div className="empty card">
        <div className="empty-icon"><Icon name="search" size={26} /></div>
        <h3>{error}</h3>
        <Link to="/shop" className="btn btn-primary">Back to shop</Link>
      </div>
    );
  }
  if (!data?.product) return <PageSkeleton />;

  const { product } = data;
  const related = list(data.related);
  const out = !(product.stock > 0);
  const onSale = product.compareAtPrice > product.price;
  const off = onSale ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0;
  const images = product.images?.length ? product.images : [''];
  const low = !out && product.stock <= 5;

  const addToCart = () => { add(product, qty); toast(`Added ${qty} × “${product.name}” to your cart`); };

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/shop">Shop</Link>
        {product.category && <><Icon name="chevron-right" size={14} /><Link to={`/shop?category=${product.category.slug}`}>{product.category.name}</Link></>}
        <Icon name="chevron-right" size={14} /><span aria-current="page">{product.name}</span>
      </nav>

      <div className="detail">
        <div className="gallery">
          <div className="gallery-main card">
            <img src={imgUrl(images[active])} alt={product.name} />
            {onSale && !out && <span className="tag tag-sale">-{off}%</span>}
          </div>
          {images.length > 1 && (
            <div className="thumbs">
              {images.map((src, i) => (
                <button key={i} className={i === active ? 'active' : ''} onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`} aria-pressed={i === active}>
                  <img src={imgUrl(src)} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="detail-info">
          {(product.brand || product.category?.name) && <span className="eyebrow">{product.brand || product.category.name}</span>}
          <h1>{product.name}</h1>
          <div className="price-row big">
            <strong>{money(product.price)}</strong>
            {onSale && <><s className="muted">{money(product.compareAtPrice)}</s><span className="save">Save {off}%</span></>}
          </div>
          <p className={out ? 'stock out' : low ? 'stock low' : 'stock'}>
            <Icon name={out ? 'x' : 'check'} size={16} strokeWidth={2.5} /> {out ? 'Out of stock' : low ? `Only ${product.stock} left` : 'In stock'}
          </p>
          {product.description && <p className="desc">{product.description}</p>}

          {!out && (
            <div className="buy-row">
              <div className="qty" role="group" aria-label="Quantity">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" disabled={qty <= 1}><Icon name="minus" size={16} /></button>
                <span aria-live="polite">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} aria-label="Increase quantity" disabled={qty >= product.stock}><Icon name="plus" size={16} /></button>
              </div>
              <button className="btn btn-primary btn-lg" onClick={addToCart}><Icon name="cart" size={18} /> Add to cart</button>
              <button className="btn btn-ghost btn-lg" onClick={() => { add(product, qty); navigate('/cart'); }}>Buy now</button>
            </div>
          )}

          <ul className="assure">
            <li><Icon name="truck" size={18} /> Free shipping on qualifying orders</li>
            <li><Icon name="card" size={18} /> Cash on Delivery, GCash or bank transfer</li>
            <li><Icon name="shield" size={18} /> Prices and stock are confirmed at checkout</li>
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="related">
          <div className="section-head"><h2 className="section-title">You may also like</h2></div>
          <div className="grid">{related.map((p) => <ProductCard key={p._id} product={p} />)}</div>
        </section>
      )}

      {!out && (
        <div className="buybar" role="region" aria-label="Quick add to cart">
          <div className="buybar-price"><strong>{money(product.price * qty)}</strong><span className="muted small">{qty > 1 ? `${qty} × ${money(product.price)}` : product.name}</span></div>
          <button className="btn btn-primary btn-lg" onClick={addToCart}><Icon name="cart" size={18} /> Add to cart</button>
        </div>
      )}
      {!out && <div className="buybar-space" aria-hidden="true" />}
    </>
  );
}
