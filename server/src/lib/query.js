const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exact = (s) => new RegExp(`^${esc(s)}$`, 'i');

export const SORTS = {
  featured: { reviews: -1, rating: -1 },
  price_asc: { price: 1, rating: -1 },
  price_desc: { price: -1, rating: -1 },
  rating_desc: { rating: -1, reviews: -1 },
  newest: { createdAt: -1 },
};

const num = (v) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? undefined : Number(v));

/** Turns loose params (query string OR AI-extracted filters) into a Mongo filter. */
export function buildFilter(p = {}) {
  const f = {};
  const and = [];

  if (p.category) f.category = exact(p.category);
  if (p.subCategory) f.subCategory = exact(p.subCategory);
  if (p.brand) f.brand = exact(p.brand);
  if (Array.isArray(p.brands) && p.brands.length) f.brand = { $in: p.brands.map(exact) };

  const minPrice = num(p.minPrice);
  const maxPrice = num(p.maxPrice ?? p.budget);
  if (minPrice !== undefined || maxPrice !== undefined) {
    f.price = {};
    if (minPrice !== undefined) f.price.$gte = minPrice;
    if (maxPrice !== undefined) f.price.$lte = maxPrice;
  }
  const minRating = num(p.minRating);
  if (minRating !== undefined) f.rating = { $gte: minRating };
  if (p.inStock === true || p.inStock === 'true' || p.inStockOnly === true) f.stock = { $gt: 0 };

  const ram = num(p.minRamGB);
  if (ram) f['specs.ramGB'] = { $gte: ram };
  const storage = num(p.minStorageGB);
  if (storage) f['specs.storageGB'] = { $gte: storage };

  if (p.q && String(p.q).trim()) {
    String(p.q)
      .trim()
      .split(/\s+/)
      .forEach((term) => {
        const r = new RegExp(esc(term), 'i');
        and.push({ $or: [{ name: r }, { brand: r }, { description: r }, { tags: r }, { category: r }, { subCategory: r }] });
      });
  }
  if (and.length) f.$and = and;
  return f;
}

export const parseListParams = (q) => ({
  q: q.q,
  category: q.category,
  subCategory: q.subCategory,
  brand: q.brand,
  minPrice: q.minPrice,
  maxPrice: q.maxPrice,
  minRating: q.minRating,
  inStock: q.inStock,
});
