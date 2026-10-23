import { useCallback, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api';
import ProductCard from './components/ProductCard';
import Filters from './components/Filters';
import Assistant from './components/Assistant';
import AuthModal from './components/AuthModal';
import ProductModal from './components/ProductModal';
import CompareView from './components/CompareView';
import CartView from './components/CartView';

const DEFAULTS = { q: '', category: '', subCategory: '', brand: '', maxPrice: '', minRating: '', inStock: false, sort: 'featured' };

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('shop');
  const [meta, setMeta] = useState(null);
  const [filters, setFilters] = useState(DEFAULTS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [ai, setAi] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [cart, setCart] = useState([]);
  const [compare, setCompare] = useState([]);
  const [detail, setDetail] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showAssistant, setShowAssistant] = useState(true);
  const [order, setOrder] = useState(null);
  const [toast, setToast] = useState('');

  const say = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const loadUserData = useCallback(async () => {
    const [w, c] = await Promise.all([api.get('/wishlist'), api.get('/cart')]);
    setWishlist(w.wishlist); setCart(c.cart);
  }, []);

  // initial load
  useEffect(() => {
    api.get('/products/meta').then(setMeta).catch((e) => setApiError(e.message));
    if (getToken()) {
      api.get('/auth/me').then(({ user }) => { setUser(user); return loadUserData(); }).catch(() => setToken(''));
    }
  }, [loadUserData]);

  // catalog fetch (debounced for the search box)
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      const qs = new URLSearchParams({ page, limit: 12, sort: filters.sort });
      ['q', 'category', 'subCategory', 'brand', 'maxPrice', 'minRating'].forEach((k) => filters[k] && qs.set(k, filters[k]));
      if (filters.inStock) qs.set('inStock', 'true');
      try { setData(await api.get('/products?' + qs)); setApiError(''); } catch (e) { setApiError(e.message); }
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [filters, page]);

  useEffect(() => setPage(1), [filters]);

  const needLogin = (fn) => (...a) => { if (!user) { setShowAuth(true); say('Please log in first'); return; } return fn(...a); };

  const toggleWish = needLogin(async (p) => {
    try { const r = await api.post(`/wishlist/${p.productId}`); setWishlist(r.wishlist); say(r.added ? 'Added to wishlist' : 'Removed from wishlist'); } catch (e) { say(e.message); }
  });
  const setQty = needLogin(async (p, qty) => {
    try { setCart((await api.put('/cart', { productId: p.productId, qty })).cart); } catch (e) { say(e.message); }
  });
  const addToCart = needLogin(async (p) => {
    const cur = cart.find((c) => c.product.productId === p.productId)?.qty || 0;
    await setQty(p, cur + 1); say(`${p.name} added to cart`);
  });
  const checkout = async () => {
    try { const { order } = await api.post('/orders'); setOrder(order); setCart([]); } catch (e) { say(e.message); }
  };
  const toggleCompare = (p) => setCompare((c) => c.some((x) => x.productId === p.productId) ? c.filter((x) => x.productId !== p.productId) : c.length >= 4 ? (say('Compare up to 4 products'), c) : [...c, p]);

  const logout = () => { setToken(''); setUser(null); setWishlist([]); setCart([]); setOrder(null); };
  const onAuth = async (u) => { setUser(u); setShowAuth(false); await loadUserData(); say(`Welcome, ${u.name}!`); };

  const wishIds = new Set(wishlist.map((p) => p.productId));
  const cmpIds = new Set(compare.map((p) => p.productId));
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const cardProps = (p) => ({ p, inWishlist: wishIds.has(p.productId), inCompare: cmpIds.has(p.productId), onWish: toggleWish, onCompare: toggleCompare, onAdd: addToCart, onOpen: setDetail });
  const renderGrid = (items, isAi = false) => (
    <div className="grid">{items.map((p, i) => <ProductCard key={p.productId} {...cardProps(p)} reason={isAi ? p.reason : null} rank={isAi && p.reason ? i + 1 : null} />)}</div>
  );

  const goShop = () => setView('shop');

  return (
    <div className="app">
      <header className="top">
        <div className="logo" onClick={() => { goShop(); setAi(null); }}>🛍️ ShopSmart <b>AI</b></div>
        <input className="search" placeholder="Search products, brands, categories…" value={filters.q}
          onChange={(e) => { setAi(null); goShop(); setFilters({ ...filters, q: e.target.value }); }} />
        <nav>
          <button className={view === 'shop' ? 'on' : ''} onClick={goShop}>Shop</button>
          <button className={view === 'compare' ? 'on' : ''} onClick={() => setView('compare')}>Compare{compare.length ? ` (${compare.length})` : ''}</button>
          <button className={view === 'wishlist' ? 'on' : ''} onClick={() => (user ? setView('wishlist') : setShowAuth(true))}>♡ {wishlist.length || ''}</button>
          <button className={view === 'cart' ? 'on' : ''} onClick={() => (user ? setView('cart') : setShowAuth(true))}>🛒 {cartCount || ''}</button>
          {user ? <button onClick={logout} title="Log out">{user.name.split(' ')[0]} · {user.tier} ⏻</button> : <button className="primary" onClick={() => setShowAuth(true)}>Log in</button>}
          <button onClick={() => setShowAssistant((s) => !s)}>✨ AI</button>
        </nav>
      </header>

      <div className={'layout' + (showAssistant ? ' with-ai' : '')}>
        <main>
          {apiError && <div className="banner err">⚠ {apiError} — is the API running and MongoDB connected?</div>}

          {view === 'shop' && (
            <div className="shop">
              <Filters meta={meta} filters={filters} setFilters={(f) => { setAi(null); setFilters(f); }} />
              <section>
                {ai ? (
                  <>
                    <div className="banner ai">
                      <div><strong>✨ AI results:</strong> {ai.interpretedRequirement || 'your request'} — {ai.total} match{ai.total === 1 ? '' : 'es'}{ai.sortBy && ai.sortBy !== 'relevance' ? `, sorted by ${ai.sortBy.replace('_', ' ')}` : ', ranked by relevance'}</div>
                      <button className="link" onClick={() => setAi(null)}>Clear ✕</button>
                    </div>
                    {ai.matches.length ? renderGrid(ai.matches, true) : <div className="empty">No products matched. Try relaxing your budget or requirements.</div>}
                  </>
                ) : (
                  <>
                    <div className="toolbar">
                      <span className="muted">{loading ? 'Loading…' : `${data.total} products`}</span>
                      <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
                        <option value="featured">Sort: Featured</option><option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option><option value="rating_desc">Top rated</option>
                      </select>
                    </div>
                    {!loading && !data.items.length ? <div className="empty">No products match your filters.</div> : renderGrid(data.items)}
                    {data.pages > 1 && (
                      <div className="pager">
                        <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
                        <span>Page {page} of {data.pages}</span>
                        <button className="btn" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next →</button>
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          )}

          {view === 'compare' && <><h2>Compare products</h2><CompareView items={compare} onRemove={toggleCompare} onAdd={addToCart} /></>}
          {view === 'wishlist' && <><h2>My wishlist</h2>{wishlist.length ? renderGrid(wishlist) : <div className="empty">Your wishlist is empty.</div>}</>}
          {view === 'cart' && <><h2>Shopping cart</h2><CartView cart={cart} onQty={setQty} onCheckout={checkout} order={order} /></>}
        </main>

        {showAssistant && (
          <Assistant lastFilters={ai?.appliedFilters || null} onClose={() => setShowAssistant(false)}
            onResult={(r) => { setAi(r); goShop(); }} />
        )}
      </div>

      {detail && <ProductModal p={detail} onClose={() => setDetail(null)} onAdd={addToCart} onWish={toggleWish} inWishlist={wishIds.has(detail.productId)} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={onAuth} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
