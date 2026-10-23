# ShopSmart AI — MERN + Gemini

AI-powered e-commerce assistant built with **MongoDB Atlas, Express, React 19 (Vite) and Node.js**, using **Google Gemini**
for intent understanding, product recommendation and policy Q&A (RAG-style, grounded in approved documents).

## Run it (3 steps)

1. Open `server/.env` and replace `MONGO_HOST=REPLACE_WITH_CLUSTER_HOST` with your Atlas cluster host
   (Atlas → Connect → Drivers → the part after `@`, e.g. `cluster0.ab1cd.mongodb.net`).
   In Atlas → **Network Access**, allow your IP (or `0.0.0.0/0` for the demo).
2. `npm run install:all`
3. `npm run dev` → open **http://localhost:5173**

The database seeds itself on first start (41 products, 11 policy sections, a demo user). Re-seed any time: `npm run seed`.

Single-port mode (nicer for a panel demo): `npm run build && npm start` → http://localhost:5000

**Demo login:** `demo@shopsmart.com` / `demo1234` (Prime member)

## Panel demo script

| Step | Do this | What it shows |
|---|---|---|
| 1 | Open the AI panel → *"Suggest a laptop under $1000 for Java development and AI projects"* | Intent extraction → Mongo filter → ranked results with a reason per pick |
| 2 | Follow up: *"Only Lenovo please"* then *"cheapest first"* | Multi-turn refinement (previous filters are carried over) |
| 3 | *"Cheapest wireless noise cancelling headphones"* | Sorting + tag matching |
| 4 | Tick **Compare** on 2–3 laptops → Compare tab | Side-by-side specs, best price/rating highlighted |
| 5 | Log in → add to cart / wishlist → place order | Cart, wishlist, simulated order with mocked delivery ETA by membership tier |
| 6 | AI panel → **Policy Q&A** → *"Can I return an opened laptop?"* | Grounded answer + confidence + source document/section/version |
| 7 | Normal browsing: category tree, price slider, brand, rating, sort, pagination | Classic catalog features |

## How the AI works

```
user message ──► Gemini #1: extract filters (category, budget, tags, brand, RAM, sort…)  [JSON, constrained to real catalog values]
             ──► MongoDB query + ranking (tag overlap, rating, stock) with auto-relaxation if nothing matches
             ──► Gemini #2: pick top picks + one-line reasons from the retrieved candidates only (no invented products)
             ──► UI shows the filtered/sorted grid with "AI pick" badges
```
* If Gemini is unreachable, a built-in rule-based parser takes over so the demo keeps working (response has `engine: "fallback"`).
* Policy Q&A: retrieves the best-matching policy sections from MongoDB, Gemini answers **only** from them and returns
  `{answer, confidence, sources[{document, section, version}], followUpRequired}`.
  (Retrieval is keyword-based; embeddings + a vector index is the natural upgrade.)

## API

| Method | Route | Notes |
|---|---|---|
| GET | `/api/products` | `q, category, subCategory, brand, minPrice, maxPrice, minRating, inStock, sort, page, limit` |
| GET | `/api/products/meta` · `/compare?ids=` · `/:productId` | category tree, brands, price range |
| POST | `/api/auth/register` · `/login` · GET `/me` | JWT |
| GET/POST/PUT | `/api/wishlist`, `/api/cart`, `/api/orders` | auth required |
| POST | `/api/ai/shop` | `{message, history, lastFilters}` → recommendations + matches |
| POST | `/api/ai/ask` | `{question}` → grounded policy answer |
| GET | `/api/health` | shows whether DB and Gemini are connected |

## Project layout
```
server/  Express API (src/routes, src/lib/shopAssistant.js, src/lib/knowledge.js, src/seed)
client/  React 19 + Vite UI (src/components)
```
Requires Node 20+. Secrets live in `server/.env` (git-ignored) — rotate them after the demo.
