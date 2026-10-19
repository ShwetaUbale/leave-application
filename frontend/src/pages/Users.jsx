import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { toast } from '../effects.js';
import { initials, colorFor } from '../ui.js';

const EMPTY = { name: '', email: '', password: '', role: 'employee' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const load = useCallback(
    () => api.get('/users').then(setUsers).catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const u = await api.post('/users', form);
      setForm(EMPTY);
      toast(`${u.name} added to the team`);
      await load();
    } catch (err) {
      setError(err.message);
      toast(err.message, 'error');
    }
  }

  return (
    <>
      <section>
        <div className="section-head"><h3>add someone</h3></div>
        <form className="tile form" onSubmit={submit}>
          <label>name<input value={form.name} onChange={set('name')} required /></label>
          <label>email<input type="email" value={form.email} onChange={set('email')} required /></label>
          <label>temp password
            <input type="password" value={form.password} onChange={set('password')} minLength={6} required />
          </label>
          <label>role
            <select value={form.role} onChange={set('role')}>
              <option value="employee">employee</option>
              <option value="manager">manager</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <button className="primary">create account</button>
        </form>
        {error && <p className="error shake">{error}</p>}
      </section>
      <section>
        <div className="section-head">
          <h3>people</h3><span className="count">{users.length}</span>
        </div>
        <table>
          <thead><tr><th>name</th><th>email</th><th>role</th></tr></thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} style={{ '--i': i }}>
                <td data-label="name">
                  <span className="person">
                    <span className="avatar sm" style={{ '--c': colorFor(u.name) }}>{initials(u.name)}</span>
                    {u.name}
                  </span>
                </td>
                <td data-label="email">{u.email}</td>
                <td data-label="role"><span className="role-tag">{u.role}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
