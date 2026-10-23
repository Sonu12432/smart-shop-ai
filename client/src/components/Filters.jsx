export default function Filters({ meta, filters, setFilters }) {
  if (!meta) return <aside className="sidebar" />;
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const cat = meta.categories.find((c) => c.name === filters.category);
  return (
    <aside className="sidebar">
      <div className="row between"><h4>Filters</h4>
        <button className="link" onClick={() => setFilters({ q: '', category: '', subCategory: '', brand: '', maxPrice: '', minRating: '', inStock: false, sort: 'featured' })}>Reset</button>
      </div>

      <h5>Category</h5>
      <ul className="tree">
        <li className={!filters.category ? 'active' : ''} onClick={() => set({ category: '', subCategory: '' })}>All categories</li>
        {meta.categories.map((c) => (
          <li key={c.name}>
            <div className={filters.category === c.name && !filters.subCategory ? 'active' : ''} onClick={() => set({ category: c.name, subCategory: '' })}>{c.name} <span className="muted small">({c.count})</span></div>
            {filters.category === c.name && (
              <ul>{c.subs.map((s) => (
                <li key={s.name} className={filters.subCategory === s.name ? 'active' : ''} onClick={() => set({ subCategory: s.name })}>{s.name} <span className="muted small">({s.count})</span></li>
              ))}</ul>
            )}
          </li>
        ))}
      </ul>

      <h5>Max price: {filters.maxPrice ? '$' + filters.maxPrice : 'Any'}</h5>
      <input type="range" min={10} max={Math.ceil(meta.priceMax / 100) * 100} step={10} value={filters.maxPrice || Math.ceil(meta.priceMax / 100) * 100}
        onChange={(e) => set({ maxPrice: Number(e.target.value) >= Math.ceil(meta.priceMax / 100) * 100 ? '' : e.target.value })} />

      <h5>Brand</h5>
      <select value={filters.brand} onChange={(e) => set({ brand: e.target.value })}>
        <option value="">All brands</option>
        {meta.brands.map((b) => <option key={b}>{b}</option>)}
      </select>

      <h5>Min rating</h5>
      <select value={filters.minRating} onChange={(e) => set({ minRating: e.target.value })}>
        <option value="">Any</option><option value="4">4★ & up</option><option value="4.5">4.5★ & up</option>
      </select>

      <label className="check"><input type="checkbox" checked={filters.inStock} onChange={(e) => set({ inStock: e.target.checked })} /> In stock only</label>
      {cat && <p className="muted small">Browsing {cat.name}{filters.subCategory ? ` › ${filters.subCategory}` : ''}</p>}
    </aside>
  );
}
