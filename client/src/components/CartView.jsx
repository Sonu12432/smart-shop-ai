import { money } from '../api';
import { Thumb } from './ProductCard';

export default function CartView({ cart, onQty, onCheckout, order }) {
  const total = cart.reduce((s, c) => s + c.product.price * c.qty, 0);
  return (
    <div>
      {order && (
        <div className="success">
          <h3>🎉 Order {order.orderId} placed (simulated)</h3>
          <p>Total {money(order.total)} · Estimated delivery: {order.eta}</p>
          <p className="small">{order.events.map((e) => e.status).join('  →  ')}</p>
        </div>
      )}
      {!cart.length ? <div className="empty">Your cart is empty.</div> : (
        <div className="cart">
          {cart.map(({ product: p, qty }) => (
            <div key={p.productId} className="cart-row">
              <Thumb p={p} />
              <div className="grow"><strong>{p.name}</strong><div className="muted small">{p.brand} · {money(p.price)} each</div></div>
              <div className="qty">
                <button onClick={() => onQty(p, qty - 1)}>−</button><span>{qty}</span><button onClick={() => onQty(p, qty + 1)}>+</button>
              </div>
              <strong className="line">{money(p.price * qty)}</strong>
              <button className="link" onClick={() => onQty(p, 0)}>Remove</button>
            </div>
          ))}
          <div className="row between total"><span>Total</span><strong>{money(total)}</strong></div>
          <button className="btn primary wide" onClick={onCheckout}>Place order (simulated payment)</button>
        </div>
      )}
    </div>
  );
}
