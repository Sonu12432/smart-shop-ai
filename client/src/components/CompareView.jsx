import { money } from '../api';
import { Thumb } from './ProductCard';

export default function CompareView({ items, onRemove, onAdd }) {
  if (items.length < 2) return <div className="empty">Tick “Compare” on at least 2 products to compare them side by side.</div>;
  const specKeys = [...new Set(items.flatMap((p) => Object.keys(p.specs || {})))];
  const best = (fn, pick) => { const v = items.map(fn); return pick(...v.filter((x) => x != null)); };
  const lowest = best((p) => p.price, Math.min), top = best((p) => p.rating, Math.max);
  return (
    <div className="table-wrap">
      <table className="compare">
        <thead><tr><th />{items.map((p) => (
          <th key={p.productId}><Thumb p={p} /><div>{p.name}</div><button className="link" onClick={() => onRemove(p)}>Remove</button></th>))}</tr></thead>
        <tbody>
          <tr><td>Price</td>{items.map((p) => <td key={p.productId} className={p.price === lowest ? 'win' : ''}>{money(p.price)}</td>)}</tr>
          <tr><td>Rating</td>{items.map((p) => <td key={p.productId} className={p.rating === top ? 'win' : ''}>★ {p.rating}</td>)}</tr>
          <tr><td>Brand</td>{items.map((p) => <td key={p.productId}>{p.brand}</td>)}</tr>
          <tr><td>Availability</td>{items.map((p) => <td key={p.productId}>{p.stock > 0 ? 'In stock' : 'Out of stock'}</td>)}</tr>
          {specKeys.map((k) => <tr key={k}><td>{k}</td>{items.map((p) => <td key={p.productId}>{String(p.specs?.[k] ?? '—')}</td>)}</tr>)}
          <tr><td /> {items.map((p) => <td key={p.productId}><button className="btn primary" disabled={p.stock <= 0} onClick={() => onAdd(p)}>Add to cart</button></td>)}</tr>
        </tbody>
      </table>
    </div>
  );
}
