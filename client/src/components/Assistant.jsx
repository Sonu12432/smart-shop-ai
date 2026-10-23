import { useEffect, useRef, useState } from 'react';
import { api, money } from '../api';

const SHOP_EXAMPLES = [
  'Suggest a laptop under $1000 for Java development and AI projects',
  'Cheapest wireless noise cancelling headphones',
  'Best rated running shoes under $100',
  'Only Lenovo please',
];
const POLICY_EXAMPLES = [
  'Can I return an opened laptop?',
  'What is the refund timeline?',
  'Does Prime membership include free delivery?',
  'Can I cancel my order after shipment?',
];

export default function Assistant({ onResult, lastFilters, onClose }) {
  const [mode, setMode] = useState('shop');
  const [msgs, setMsgs] = useState({ shop: [], policy: [] });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, mode, busy]);
  const push = (m, item) => setMsgs((s) => ({ ...s, [m]: [...s[m], item] }));

  const send = async (q) => {
    const message = (q ?? text).trim();
    if (!message || busy) return;
    setText('');
    push(mode, { role: 'user', text: message });
    setBusy(true);
    try {
      if (mode === 'shop') {
        const history = msgs.shop.slice(-4).map((m) => ({ role: m.role, text: m.text || m.data?.summary }));
        const data = await api.post('/ai/shop', { message, history, lastFilters });
        push('shop', { role: 'ai', data });
        if (data.matches?.length || !data.clarifyingQuestion) onResult(data);
      } else {
        const data = await api.post('/ai/ask', { question: message });
        push('policy', { role: 'ai', policy: data });
      }
    } catch (e) {
      push(mode, { role: 'ai', error: e.message });
    }
    setBusy(false);
  };

  const list = msgs[mode];
  return (
    <div className="assistant">
      <div className="a-head">
        <div><strong>✨ ShopSmart AI</strong><div className="small muted">Powered by Gemini</div></div>
        <button className="close static" onClick={onClose}>✕</button>
      </div>
      <div className="tabs">
        <button className={mode === 'shop' ? 'on' : ''} onClick={() => setMode('shop')}>🛍️ Find products</button>
        <button className={mode === 'policy' ? 'on' : ''} onClick={() => setMode('policy')}>📄 Policy Q&A</button>
      </div>

      <div className="a-body">
        {!list.length && (
          <div className="hint">
            <p>{mode === 'shop' ? 'Tell me what you need — I’ll filter and sort the catalog for you.' : 'Ask about returns, refunds, shipping, warranty or membership. Answers come only from approved policy documents.'}</p>
            {(mode === 'shop' ? SHOP_EXAMPLES : POLICY_EXAMPLES).map((e) => <button key={e} className="chip" onClick={() => send(e)}>{e}</button>)}
          </div>
        )}

        {list.map((m, i) => m.role === 'user'
          ? <div key={i} className="bubble user">{m.text}</div>
          : <div key={i} className="bubble ai">
              {m.error && <span className="error">⚠ {m.error}</span>}
              {m.data && <ShopReply d={m.data} />}
              {m.policy && <PolicyReply d={m.policy} />}
            </div>)}
        {busy && <div className="bubble ai typing"><span /><span /><span /></div>}
        <div ref={end} />
      </div>

      <form className="a-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === 'shop' ? 'e.g. gaming laptop under $1000 with 16GB RAM' : 'Ask a policy question…'} />
        <button className="btn primary" disabled={busy || !text.trim()}>Send</button>
      </form>
    </div>
  );
}

function ShopReply({ d }) {
  const f = d.appliedFilters || {};
  const chips = [f.subCategory || f.category, d.budget && `≤ ${money(d.budget)}`, f.minRamGB && `${f.minRamGB}GB+ RAM`, f.minStorageGB && `${f.minStorageGB}GB+ storage`, ...(f.brands || []), ...(f.tags || []), d.sortBy && d.sortBy !== 'relevance' && `sort: ${d.sortBy.replace('_', ' ')}`].filter(Boolean);
  return (
    <>
      <p>{d.summary}</p>
      {!d.clarifyingQuestion && chips.length > 0 && <div className="chips">{chips.map((c) => <span key={c} className="tag">{c}</span>)}</div>}
      {d.recommendations?.slice(0, 3).map((r) => (
        <div key={r.productId} className="rec">
          <div className="row between"><strong>{r.emoji} {r.productName}</strong><span>{money(r.price)}</span></div>
          <div className="small muted">{r.reason}</div>
        </div>
      ))}
      {d.matches?.length > 0 && <p className="small muted">↳ Showing all {d.total} match{d.total > 1 ? 'es' : ''} in the catalog. {d.engine !== 'gemini' && <em>(offline mode: {d.engine})</em>}</p>}
    </>
  );
}

function PolicyReply({ d }) {
  return (
    <>
      <p>{d.answer}</p>
      <div className="row gap small"><span className={'badge conf ' + d.confidence}>{d.confidence} confidence</span>{d.followUpRequired && <span className="badge low">Follow-up needed</span>}</div>
      {d.sources?.map((s, i) => <div key={i} className="small muted">📎 {s.document} › {s.section} (v{s.version})</div>)}
    </>
  );
}
