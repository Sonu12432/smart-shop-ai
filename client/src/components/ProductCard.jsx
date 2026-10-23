import { money } from '../api';

const GRADS = {
  Electronics: ['#6366f1', '#8b5cf6'], Fashion: ['#ec4899', '#f97316'], 'Home Appliances': ['#0ea5e9', '#14b8a6'],
  Books: ['#f59e0b', '#ef4444'], Healthcare: ['#10b981', '#06b6d4'], Groceries: ['#84cc16', '#eab308'],
};

export const stockLabel = (p) => (p.stock <= 0 ? ['Out of stock', 'out'] : p.stock <= 10 ? [`Only ${p.stock} left`, 'low'] : ['In stock', 'in']);

export function Thumb({ p, big }) {
  const [a, b] = GRADS[p.category] || GRADS.Electronics;
  return (
    <div className={big ? 'thumb big' : 'thumb'} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
      <span>{p.emoji}</span>
    </div>
  );
}

export default function ProductCard({ p, reason, rank, inWishlist, inCompare, onWish, onCompare, onAdd, onOpen }) {
  const [label, kind] = stockLabel(p);
  return (
    <article className={'card' + (reason ? ' picked' : '')}>
      {rank && <span className="rank">AI pick #{rank}</span>}
      <button className={'heart' + (inWishlist ? ' on' : '')} onClick={() => onWish(p)} title="Wishlist">{inWishlist ? '♥' : '♡'}</button>
      <div onClick={() => onOpen(p)} style={{ cursor: 'pointer' }}>
        <Thumb p={p} />
        <div className="card-body">
          <div className="muted small">{p.brand} · {p.subCategory}</div>
          <h3>{p.name}</h3>
          <div className="row between">
            <span className="price">{money(p.price)}</span>
            <span className="rating">★ {p.rating} <span className="muted small">({p.reviews.toLocaleString()})</span></span>
          </div>
          <span className={'badge ' + kind}>{label}</span>
        </div>
      </div>
      {reason && <p className="reason">✨ {reason}</p>}
      <div className="row gap card-actions">
        <button className="btn primary grow" disabled={p.stock <= 0} onClick={() => onAdd(p)}>Add to cart</button>
        <label className="cmp" title="Compare"><input type="checkbox" checked={inCompare} onChange={() => onCompare(p)} /> Compare</label>
      </div>
    </article>
  );
}
