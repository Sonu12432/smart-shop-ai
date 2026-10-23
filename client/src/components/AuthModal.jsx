import { useState } from 'react';
import { api, setToken } from '../api';

export default function AuthModal({ onClose, onAuth }) {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: 'demo@shopsmart.com', password: 'demo1234', tier: 'Basic' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const { token, user } = await api.post(`/auth/${mode}`, f);
      setToken(token);
      onAuth(user);
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  };
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal small-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
        {mode === 'register' && <input placeholder="Full name" value={f.name} onChange={upd('name')} required />}
        <input type="email" placeholder="Email" value={f.email} onChange={upd('email')} required />
        <input type="password" placeholder="Password" value={f.password} onChange={upd('password')} required />
        {mode === 'register' && (
          <select value={f.tier} onChange={upd('tier')}>
            <option>Basic</option><option>Prime</option><option>Premium</option>
          </select>
        )}
        {err && <p className="error">{err}</p>}
        <button className="btn primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
        <p className="muted small center">
          {mode === 'login' ? <>Demo account is pre-filled (Prime member). New here? <button type="button" className="link" onClick={() => setMode('register')}>Sign up</button></>
            : <>Have an account? <button type="button" className="link" onClick={() => setMode('login')}>Log in</button></>}
        </p>
      </form>
    </div>
  );
}
