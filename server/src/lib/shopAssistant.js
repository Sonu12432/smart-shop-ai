import { Product } from '../models.js';
import { gemini, geminiEnabled } from './gemini.js';
import { buildFilter } from './query.js';

const SORT_KEYS = ['relevance', 'price_asc', 'price_desc', 'rating_desc'];

// ---------- catalog vocabulary (grounds the LLM so it only uses real values) ----------
let vocabCache = { at: 0, value: null };
async function getVocab() {
  if (vocabCache.value && Date.now() - vocabCache.at < 60_000) return vocabCache.value;
  const rows = await Product.find({}, 'category subCategory brand tags').lean();
  const pairs = new Map();
  const brands = new Set();
  const tags = new Set();
  for (const r of rows) {
    if (!pairs.has(r.category)) pairs.set(r.category, new Set());
    pairs.get(r.category).add(r.subCategory);
    brands.add(r.brand);
    (r.tags || []).forEach((t) => tags.add(t));
  }
  const value = {
    categories: [...pairs].map(([c, s]) => ({ category: c, subCategories: [...s] })),
    brands: [...brands],
    tags: [...tags],
  };
  vocabCache = { at: Date.now(), value };
  return value;
}

const blank = () => ({
  interpretedRequirement: '',
  category: null,
  subCategory: null,
  budget: null,
  minPrice: null,
  minRating: null,
  brands: [],
  tags: [],
  keywords: [],
  minRamGB: null,
  minStorageGB: null,
  inStockOnly: false,
  sortBy: 'relevance',
  clarifyingQuestion: null,
});

const toNum = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v));
const toArr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()) : []);

function normalize(raw, vocab) {
  const r = { ...blank(), ...(raw || {}) };
  const lc = (s) => String(s || '').toLowerCase();
  const catMatch = vocab.categories.find((c) => lc(c.category) === lc(r.category));
  const subMatch = vocab.categories.flatMap((c) => c.subCategories.map((s) => ({ c: c.category, s }))).find((x) => lc(x.s) === lc(r.subCategory));
  r.category = catMatch ? catMatch.category : subMatch ? subMatch.c : null;
  r.subCategory = subMatch ? subMatch.s : null;
  r.budget = toNum(r.budget);
  r.minPrice = toNum(r.minPrice);
  r.minRating = toNum(r.minRating);
  r.minRamGB = toNum(r.minRamGB);
  r.minStorageGB = toNum(r.minStorageGB);
  r.brands = toArr(r.brands).map((b) => vocab.brands.find((x) => lc(x) === lc(b))).filter(Boolean);
  r.tags = toArr(r.tags).map((t) => vocab.tags.find((x) => lc(x) === lc(t))).filter(Boolean);
  r.keywords = toArr(r.keywords);
  r.inStockOnly = Boolean(r.inStockOnly);
  r.sortBy = SORT_KEYS.includes(r.sortBy) ? r.sortBy : 'relevance';
  r.clarifyingQuestion = r.clarifyingQuestion ? String(r.clarifyingQuestion) : null;
  r.interpretedRequirement = String(r.interpretedRequirement || '');
  return r;
}

// ---------- 1) understand the request ----------
async function extractWithGemini(message, history, prev, vocab, user) {
  const system = `You convert a shopper's message into structured search filters for the ShopSmart catalog.

Catalog (Category > SubCategories): ${vocab.categories.map((c) => `${c.category} > ${c.subCategories.join(', ')}`).join(' | ')}
Known brands: ${vocab.brands.join(', ')}
Known tags: ${vocab.tags.join(', ')}

Rules:
- Use ONLY category, subCategory, brands and tags values from the lists above (exact spelling). Otherwise use null / [].
- "budget" = maximum price in USD (number). "minPrice" only if the user gives a lower bound.
- Map use-cases to tags, e.g. "Java development" -> programming, "AI projects" or "machine learning" -> ai, "college" -> student, "cheap" -> budget, "noise cancelling" -> noise-cancelling, "gym" -> fitness.
- Specs: "16GB RAM" -> minRamGB 16; "512GB storage" -> minStorageGB 512 (1TB = 1024).
- sortBy: price_asc for cheapest / lowest price / cheaper, price_desc for most expensive / premium first, rating_desc for best / top rated, otherwise relevance.
- If the message refines the PREVIOUS FILTERS (e.g. "cheaper", "only Dell", "under $800 instead", "with more RAM"), start from the previous filters and apply the change. If it is a new topic, ignore previous filters.
- If the request is too vague to choose a product category, set clarifyingQuestion to ONE short question and leave other filters empty/null.
- interpretedRequirement: one short sentence summarising what the customer wants.

Return ONLY JSON with exactly these keys:
{"interpretedRequirement":string,"category":string|null,"subCategory":string|null,"budget":number|null,"minPrice":number|null,"minRating":number|null,"brands":string[],"tags":string[],"keywords":string[],"minRamGB":number|null,"minStorageGB":number|null,"inStockOnly":boolean,"sortBy":"relevance"|"price_asc"|"price_desc"|"rating_desc","clarifyingQuestion":string|null}`;

  const prompt = `PREVIOUS FILTERS: ${prev ? JSON.stringify(prev) : 'none'}
RECENT CONVERSATION: ${JSON.stringify((history || []).slice(-4))}
CUSTOMER PROFILE (soft hints only): ${user ? JSON.stringify({ tier: user.tier, preferredBrands: user.preferences?.brands, usualBudget: user.preferences?.budget }) : 'guest'}
CUSTOMER MESSAGE: ${message}`;

  return gemini({ system, prompt, json: true, temperature: 0.1 });
}

// Offline fallback so the demo never dies if the network / API key misbehaves.
export function heuristicParse(message, vocab, prev) {
  const m = message.toLowerCase();
  const r = blank();
  const refine = prev && /\b(cheaper|only|instead|also|more|less|that|those|them|it)\b/.test(m) && !/\b(laptop|phone|shoe|headphone|book)/.test(m);
  if (refine) Object.assign(r, prev);

  const CATS = [
    [/laptop|notebook|macbook/, 'Laptops'], [/headphone|earphone|earbud|airpod|audio|speaker/, 'Audio'],
    [/\b(phone|smartphone|mobile)s?\b/, 'Smartphones'], [/shoe|sneaker|footwear|running/, 'Footwear'],
    [/jeans|hoodie|t-?shirt|clothing|shirt/, 'Clothing'], [/air ?fryer|mixer|cooker|kitchen/, 'Kitchen'],
    [/vacuum|cleaner|cleaning/, 'Cleaning'], [/\bbooks?\b|novel/, null], [/fitness|yoga|tracker/, 'Fitness'],
    [/thermometer|monitor|wellness/, 'Wellness'], [/coffee|juice|drink|beverage/, 'Beverages'], [/snack|chips|namkeen|bars?/, 'Snacks'],
  ];
  for (const [re, sub] of CATS) {
    if (re.test(m)) {
      if (sub) {
        const hit = vocab.categories.find((c) => c.subCategories.includes(sub));
        if (hit) { r.category = hit.category; r.subCategory = sub; }
      } else { r.category = 'Books'; r.subCategory = null; }
      break;
    }
  }
  const b = m.match(/(?:under|below|less than|within|upto|up to|max(?:imum)?|budget(?: of)?|<)\s*(?:\$|usd|rs\.?|₹)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?/);
  if (b) r.budget = Number(b[1].replace(/,/g, '')) * (b[2] ? 1000 : 1);
  const ram = m.match(/(\d+)\s*gb\s*ram/); if (ram) r.minRamGB = Number(ram[1]);
  const st = m.match(/(\d+)\s*(gb|tb)\s*(?:ssd|storage|hdd)/); if (st) r.minStorageGB = Number(st[1]) * (st[2] === 'tb' ? 1024 : 1);
  const rt = m.match(/(\d(?:\.\d)?)\s*\+?\s*(?:stars?|rating)/); if (rt) r.minRating = Number(rt[1]);

  const TAGS = [[/java|python|code|coding|program|develop/, 'programming'], [/\bai\b|machine learning|ml\b|deep learning/, 'ai'], [/gaming|game/, 'gaming'],
    [/student|college|school/, 'student'], [/cheap|budget|affordable/, 'budget'], [/noise|anc/, 'noise-cancelling'], [/wireless|bluetooth/, 'wireless'],
    [/running|gym|workout|fitness/, 'fitness'], [/battery/, 'battery'], [/camera|photo/, 'camera'], [/premium|flagship/, 'premium'], [/travel/, 'travel'], [/portable|lightweight/, 'portable']];
  for (const [re, t] of TAGS) if (re.test(m) && vocab.tags.includes(t) && !r.tags.includes(t)) r.tags.push(t);
  for (const br of vocab.brands) if (m.includes(br.toLowerCase()) && !r.brands.includes(br)) r.brands.push(br);

  if (/cheap(est|er)|lowest price|least expensive/.test(m)) r.sortBy = 'price_asc';
  else if (/most expensive|premium first|highest price/.test(m)) r.sortBy = 'price_desc';
  else if (/best|top[- ]rated|highest rated|best rated/.test(m)) r.sortBy = 'rating_desc';
  if (/in stock|available/.test(m)) r.inStockOnly = true;

  if (!r.category && !r.tags.length && !r.brands.length) r.clarifyingQuestion = 'What kind of product are you looking for (for example a laptop, phone, headphones or shoes)?';
  const parts = [r.subCategory || r.category || 'products', r.budget ? `under $${r.budget}` : '', r.tags.length ? `for ${r.tags.join(', ')}` : ''].filter(Boolean);
  r.interpretedRequirement = parts.join(' ');
  return r;
}

// ---------- 2) filter + sort against MongoDB ----------
const overlap = (a = [], b = []) => a.filter((x) => b.includes(x)).length;

async function runSearch(req) {
  let f = { ...req };
  const dropped = [];
  // Free-text keywords only act as a hard filter when no category was identified.
  const hardQ = !f.category && !f.subCategory && f.keywords.length ? { q: f.keywords.join(' ') } : {};
  const find = () => Product.find(buildFilter({ ...f, ...hardQ })).lean();
  let docs = await find();
  for (const key of ['brands', 'minRamGB', 'minStorageGB', 'minRating', 'subCategory']) {
    if (docs.length) break;
    const v = f[key];
    if (Array.isArray(v) ? v.length : v) {
      f[key] = Array.isArray(v) ? [] : null;
      dropped.push(key);
      docs = await find();
    }
  }

  const kw = f.keywords.map((k) => k.toLowerCase());
  const score = (p) =>
    3 * overlap(p.tags, f.tags) +
    2 * kw.filter((k) => `${p.name} ${p.description}`.toLowerCase().includes(k)).length +
    p.rating +
    (p.stock > 0 ? 1 : -3) +
    (req.brands.includes(p.brand) ? 2 : 0);

  const sorters = {
    price_asc: (a, b) => a.price - b.price || b.rating - a.rating,
    price_desc: (a, b) => b.price - a.price || b.rating - a.rating,
    rating_desc: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
    relevance: (a, b) => score(b) - score(a),
  };
  docs.sort(sorters[req.sortBy] || sorters.relevance);
  return { docs: docs.slice(0, 24), total: docs.length, dropped, applied: f };
}

// ---------- 3) explain the picks ----------
const availability = (p) => (p.stock <= 0 ? 'OUT_OF_STOCK' : p.stock <= 10 ? 'LOW_STOCK' : 'IN_STOCK');

function templateReason(p, req) {
  const s = p.specs || {};
  const bits = [s.ramGB && `${s.ramGB}GB RAM`, s.cpu, s.storageGB && `${s.storageGB >= 1024 ? s.storageGB / 1024 + 'TB' : s.storageGB + 'GB'} ${s.storageType || 'storage'}`, s.gpu, s.camera && `${s.camera} camera`, s.batteryHours && `${s.batteryHours}h battery`]
    .filter(Boolean).join(', ');
  const tagHit = (p.tags || []).filter((t) => req.tags.includes(t));
  return [bits, tagHit.length ? `suits ${tagHit.join(' & ')}` : '', `rated ${p.rating}/5`, `$${p.price}`].filter(Boolean).join(' · ');
}

async function explainWithGemini(req, picks) {
  const system = `You are ShopSmart's shopping assistant. Choose the best products for the customer from the provided candidates ONLY. Never invent products or specs.
Return ONLY JSON: {"recommendations":[{"productId":string,"reason":string}],"summary":string}
- Pick up to 4 productIds, best first. Each reason is ONE sentence citing concrete data (specs, price vs budget, rating) from the candidate.
- summary: 1-2 friendly sentences describing what you found and how results are sorted.`;
  const prompt = `Customer need: ${req.interpretedRequirement}
Budget: ${req.budget ?? 'not specified'} | Sort: ${req.sortBy}
Candidates (already filtered and ranked): ${JSON.stringify(picks.map((p) => ({ productId: p.productId, name: p.name, brand: p.brand, price: p.price, rating: p.rating, stock: p.stock, tags: p.tags, specs: p.specs })))}`;
  return gemini({ system, prompt, json: true, temperature: 0.3 });
}

// ---------- public entry point ----------
export async function shopAssistant({ message, history = [], lastFilters = null, user = null }) {
  const vocab = await getVocab();
  let engine = 'gemini';
  let req;
  try {
    if (!geminiEnabled()) throw new Error('no key');
    req = normalize(await extractWithGemini(message, history, lastFilters, vocab, user), vocab);
  } catch (err) {
    console.warn('[assistant] Gemini extraction failed, using fallback parser:', err.message);
    engine = 'fallback';
    req = normalize(heuristicParse(message, vocab, lastFilters), vocab);
  }

  if (req.clarifyingQuestion && !req.category && !req.subCategory && !req.keywords.length && !req.tags.length) {
    return { interpretedRequirement: req.interpretedRequirement, budget: req.budget, appliedFilters: req, recommendations: [], matches: [], total: 0, summary: req.clarifyingQuestion, clarifyingQuestion: req.clarifyingQuestion, engine };
  }

  const { docs, total, dropped, applied } = await runSearch(req);
  const top = docs.slice(0, 6);

  let recs = [];
  let summary = '';
  if (top.length && engine === 'gemini') {
    try {
      const out = await explainWithGemini(req, top);
      const byId = new Map(top.map((p) => [p.productId, p]));
      recs = (out.recommendations || []).filter((r) => byId.has(r.productId)).slice(0, 4).map((r) => ({ productId: r.productId, reason: String(r.reason || '') }));
      summary = String(out.summary || '');
    } catch (err) {
      console.warn('[assistant] Gemini explanation failed, using templates:', err.message);
      engine = 'gemini+template';
    }
  }
  if (!recs.length) recs = top.slice(0, 4).map((p) => ({ productId: p.productId, reason: templateReason(p, req) }));
  if (!summary) {
    summary = top.length
      ? `I found ${total} matching product${total > 1 ? 's' : ''}${req.budget ? ` under $${req.budget}` : ''}, sorted by ${req.sortBy.replace('_', ' ')}.`
      : `I couldn't find anything${req.budget ? ` under $${req.budget}` : ''} that matches. Try raising the budget or relaxing a requirement.`;
  }
  if (dropped.length) summary += ` (I relaxed: ${dropped.join(', ')}, since nothing matched exactly.)`;

  const reasonById = new Map(recs.map((r) => [r.productId, r.reason]));
  const matches = docs.map((p) => ({ ...p, reason: reasonById.get(p.productId) || null, availability: availability(p) }));
  const recommendations = recs.map((r) => {
    const p = docs.find((x) => x.productId === r.productId);
    return { productId: p.productId, productName: p.name, price: p.price, rating: p.rating, reason: r.reason, availability: availability(p), emoji: p.emoji };
  });

  return {
    interpretedRequirement: req.interpretedRequirement,
    budget: req.budget,
    appliedFilters: applied,
    sortBy: req.sortBy,
    recommendations,
    matches,
    total,
    relaxed: dropped,
    summary,
    clarifyingQuestion: null,
    engine,
  };
}
