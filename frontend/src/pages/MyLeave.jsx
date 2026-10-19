import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { toast } from '../effects.js';
import { typeColor, greeting, daysUntil, prettyDate } from '../ui.js';

const today = () => new Date().toISOString().slice(0, 10);

function nextBreak(leaves) {
  return leaves
    .filter((l) => l.status === 'approved' && l.end_date >= today())
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
}

export default function MyLeave({ user }) {
  const [balance, setBalance] = useState([]);
  const [types, setTypes] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ leave_type_id: '', start_date: today(), end_date: today(), reason: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [b, t, l] = await Promise.all([
      api.get('/balance'), api.get('/leave-types'), api.get('/leaves/mine'),
    ]);
    setBalance(b);
    setTypes(t);
    setLeaves(l);
    setLoaded(true);
    setForm((f) => (f.leave_type_id ? f : { ...f, leave_type_id: t[0]?.id ?? '' }));
  }, []);

  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api.post('/leaves', { ...form, leave_type_id: Number(form.leave_type_id) });
      setForm({ ...form, reason: '' });
      toast(`request sent · ${r.days} day${r.days === 1 ? '' : 's'} of ${r.leave_type.toLowerCase()}`);
      await load();
    } catch (err) {
      setError(err.message);
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id) {
    if (!confirm('Cancel this leave request?')) return;
    try {
      await api.post(`/leaves/${id}/cancel`);
      toast('request cancelled');
      await load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  const upcoming = nextBreak(leaves);
  const away = upcoming && upcoming.start_date <= today();
  const until = upcoming ? daysUntil(upcoming.start_date) : null;
  const firstName = user.name.split(' ')[0].toLowerCase();
  const pending = leaves.filter((l) => l.status === 'pending').length;

  return (
    <>
      <section className="bento">
        <div className="tile hero">
          <p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h2>{greeting()}, {firstName}.</h2>
          <p className="hero-sub">
            {pending > 0 ? `${pending} request${pending > 1 ? 's' : ''} waiting on a reply.` : 'nothing pending. you\'re clear.'}
          </p>
        </div>
        <div className="tile accent-tile">
          <p className="eyebrow dark">{away ? 'status' : 'next out'}</p>
          {!upcoming && <div className="big-num small">none booked</div>}
          {upcoming && away && <div className="big-num small">you're off</div>}
          {upcoming && !away && (
            <>
              <div className="big-num">{until}<span> {until === 1 ? 'day' : 'days'}</span></div>
              <p className="tile-sub">{prettyDate(upcoming.start_date)} → {prettyDate(upcoming.end_date)}</p>
            </>
          )}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h3>balance</h3>
          <span className="muted">{new Date().getFullYear()}</span>
        </div>
        <div className="grid">
          {!loaded && [0, 1, 2, 3].map((i) => <div key={i} className="tile skeleton" />)}
          {balance.map((b, i) => {
            const usedPct = (b.used / b.days_per_year) * 100;
            const pendPct = (b.pending / b.days_per_year) * 100;
            return (
              <div className="tile stat lift" key={b.id} style={{ '--i': i, '--c': typeColor(b.name) }}>
                <div className="stat-top">
                  <span className="type-dot" />
                  <span>{b.name.toLowerCase()}</span>
                </div>
                <div className="stat-num">{b.remaining}<span className="stat-unit"> / {b.days_per_year}</span></div>
                <div className="bar" title={`${b.used} used, ${b.pending} pending`}>
                  <span className="bar-used" style={{ width: `${usedPct}%` }} />
                  <span className="bar-pending" style={{ width: `${pendPct}%`, left: `${usedPct}%` }} />
                </div>
                <div className="muted">{b.used} used · {b.pending} pending</div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="section-head"><h3>request time off</h3></div>
        <form className="tile form" onSubmit={submit}>
          <label>type
            <select value={form.leave_type_id} onChange={set('leave_type_id')} required>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name.toLowerCase()}</option>)}
            </select>
          </label>
          <label>from
            <input type="date" value={form.start_date} onChange={set('start_date')} required />
          </label>
          <label>to
            <input type="date" value={form.end_date} min={form.start_date} onChange={set('end_date')} required />
          </label>
          <label className="wide">note
            <input value={form.reason} onChange={set('reason')} maxLength={500}
              placeholder="optional — what's the plan?" />
          </label>
          <button className="primary" disabled={busy}>{busy ? 'sending…' : 'send request'}</button>
        </form>
        {error && <p className="error shake">{error}</p>}
      </section>

      <section>
        <div className="section-head"><h3>my requests</h3></div>
        <RequestTable rows={leaves} empty="no requests yet. go touch grass 🌱"
          action={(r) => ['pending', 'approved'].includes(r.status)
            && <button className="ghost" onClick={() => cancel(r.id)}>cancel</button>} />
      </section>
    </>
  );
}

export function RequestTable({ rows, empty, action, showUser }) {
  if (!rows.length) return <div className="empty tile">{empty}</div>;
  return (
    <table>
      <thead>
        <tr>
          {showUser && <th>who</th>}
          <th>type</th><th>from</th><th>to</th><th>days</th><th>note</th><th>status</th><th />
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.id} style={{ '--i': i }}>
            {showUser && <td data-label="who">{r.user_name}</td>}
            <td data-label="type">
              <span className="type-label" style={{ '--c': typeColor(r.leave_type) }}>
                <span className="type-dot" />{r.leave_type.toLowerCase()}
              </span>
            </td>
            <td data-label="from">{r.start_date}</td>
            <td data-label="to">{r.end_date}</td>
            <td data-label="days">{r.days}</td>
            <td data-label="note">{r.reason || '—'}</td>
            <td data-label="status">
              <span className={`status ${r.status}`}>{r.status}</span>
              {r.review_comment && <div className="muted">“{r.review_comment}” — {r.reviewer_name}</div>}
            </td>
            <td className="actions">{action?.(r)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
