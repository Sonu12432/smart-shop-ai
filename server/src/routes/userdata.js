import { Router } from 'express';
import { Product, Order } from '../models.js';
import { auth } from './auth.js';

const r = Router();
r.use(auth());

const hydrateWishlist = async (u) => {
  const items = await Product.find({ productId: { $in: u.wishlist } }).lean();
  return u.wishlist.map((id) => items.find((p) => p.productId === id)).filter(Boolean);
};
const hydrateCart = async (u) => {
  const items = await Product.find({ productId: { $in: u.cart.map((c) => c.productId) } }).lean();
  return u.cart.map((c) => ({ product: items.find((p) => p.productId === c.productId), qty: c.qty })).filter((c) => c.product);
};

r.get('/wishlist', async (req, res) => res.json({ wishlist: await hydrateWishlist(req.user) }));
r.post('/wishlist/:id', async (req, res) => {
  const id = req.params.id;
  const has = req.user.wishlist.includes(id);
  req.user.wishlist = has ? req.user.wishlist.filter((x) => x !== id) : [...req.user.wishlist, id];
  await req.user.save();
  res.json({ wishlist: await hydrateWishlist(req.user), added: !has });
});

r.get('/cart', async (req, res) => res.json({ cart: await hydrateCart(req.user) }));
r.put('/cart', async (req, res) => {
  const { productId, qty } = req.body || {};
  const product = await Product.findOne({ productId }).lean();
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (product.stock <= 0) return res.status(400).json({ error: 'This item is out of stock' });
  const q = Math.max(0, Math.min(Number(qty) || 0, product.stock, 10));
  const rest = req.user.cart.filter((c) => c.productId !== productId);
  req.user.cart = q > 0 ? [...rest, { productId, qty: q }] : rest;
  await req.user.save();
  res.json({ cart: await hydrateCart(req.user) });
});

// Simulated checkout (payment is out of scope) with mocked delivery events.
const ETA = { Basic: '5-7 days', Prime: '2 days', Premium: 'Next day' };
r.post('/orders', async (req, res) => {
  const cart = await hydrateCart(req.user);
  if (!cart.length) return res.status(400).json({ error: 'Your cart is empty' });
  const now = new Date();
  const order = await Order.create({
    orderId: 'SS-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    userId: req.user._id,
    items: cart.map((c) => ({ productId: c.product.productId, name: c.product.name, price: c.product.price, qty: c.qty })),
    total: Math.round(cart.reduce((s, c) => s + c.product.price * c.qty, 0) * 100) / 100,
    eta: ETA[req.user.tier],
    events: [{ status: 'ORDER_PLACED', at: now }, { status: 'PACKED (mock)', at: new Date(now.getTime() + 3600e3) }, { status: 'OUT_FOR_DELIVERY (mock)', at: new Date(now.getTime() + 86400e3) }],
  });
  req.user.cart = [];
  await req.user.save();
  res.json({ order });
});
r.get('/orders', async (req, res) => res.json({ orders: await Order.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean() }));

export default r;
