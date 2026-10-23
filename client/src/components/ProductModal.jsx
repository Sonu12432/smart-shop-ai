import { money } from '../api';
import { Thumb, stockLabel } from './ProductCard';

const nice = (k) => k.replace(/([A-Z])/g, ' $1').replace(/GB$/, ' GB').replace(/^./, (c) => c.toUpperCase());

export default function ProductModal({ p, onClose, onAdd, onWish, inWishlist }) {
  const [label, kind] = stockLabel(p);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        <div className="detail">
          <Thumb p={p} big />
          <div>
            <div className="muted small">{p.category} › {p.subCategory} · {p.brand} · ID {p.productId}</div>
            <h2>{p.name}</h2>
            <p className="rating">★ {p.rating} <span className="muted small">({p.reviews.toLocaleString()} reviews)</span></p>
            <p className="price big-price">{money(p.price)}</p>
            <span className={'badge ' + kind}>{label}</span>
            <p>{p.description}</p>
            <table className="specs"><tbody>
              {Object.entries(p.specs || {}).map(([k, v]) => <tr key={k}><td>{nice(k)}</td><td>{String(v)}</td></tr>)}
            </tbody></table>
            <div className="row gap">
              <button className="btn primary" disabled={p.stock <= 0} onClick={() => onAdd(p)}>Add to cart</button>
              <button className="btn" onClick={() => onWish(p)}>{inWishlist ? '♥ In wishlist' : '♡ Add to wishlist'}</button>
            </div>
            <p className="muted small">{(p.tags || []).map((t) => `#${t}`).join('  ')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
