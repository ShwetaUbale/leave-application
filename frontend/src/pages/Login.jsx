import { useState } from 'react';
import { api, setToken } from '../api.js';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token, user } = await api.post('/auth/login', { email, password });
      setToken(token);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const demo = (e, p) => { setEmail(e); setPassword(p); };

  return (
    <div className="login">
      <div className="blob b1" aria-hidden="true" />
      <div className="blob b2" aria-hidden="true" />
      <form className="login-card" onSubmit={submit}>
        <h1 className="wordmark big">leavehub<span className="dot">.</span></h1>
        <p className="tagline">time off, sorted.</p>
        <label>email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com" required autoFocus />
        </label>
        <label>password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" required />
        </label>
        {error && <p className="error shake">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'signing in…' : 'sign in'}</button>
        <div className="demo">
          <span>demo accounts</span>
          <div className="demo-row">
            <button type="button" className="chip" onClick={() => demo('employee@example.com', 'employee123')}>employee</button>
            <button type="button" className="chip" onClick={() => demo('manager@example.com', 'manager123')}>manager</button>
            <button type="button" className="chip" onClick={() => demo('admin@example.com', 'admin123')}>admin</button>
          </div>
        </div>
      </form>
    </div>
  );
}
