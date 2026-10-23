import { Router } from 'express';
import { Product } from '../models.js';
import { buildFilter, parseListParams, SORTS } from '../lib/query.js';

const r = Router();

r.get('/meta', async (_req, res) => {
  const rows = await Product.aggregate([{ $group: { _id: { c: '$category', s: '$subCategory' }, n: { $sum: 1 } } }]);
  const tree = {};
  for (const { _id, n } of rows) {
    tree[_id.c] ||= { name: _id.c, count: 0, subs: [] };
    tree[_id.c].count += n;
    tree[_id.c].subs.push({ name: _id.s, count: n });
  }
  const brands = await Product.distinct('brand');
  const [range] = await Product.aggregate([{ $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }]);
  res.json({ categories: Object.values(tree), brands: brands.sort(), priceMin: range?.min ?? 0, priceMax: range?.max ?? 2000 });
});

r.get('/compare', async (req, res) => {
  const ids = String(req.query.ids || '').split(',').filter(Boolean).slice(0, 4);
  res.json({ items: await Product.find({ productId: { $in: ids } }).lean() });
});

r.get('/', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 12));
  const sort = SORTS[req.query.sort] || SORTS.featured;
  const filter = buildFilter(parseListParams(req.query));
  const [items, total] = await Promise.all([
    Product.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

r.get('/:productId', async (req, res) => {
  const p = await Product.findOne({ productId: req.params.productId }).lean();
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(p);
});

export default r;
