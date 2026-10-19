import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { initials, hueFor } from '../ui.js';

const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

export default function Calendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [leaves, setLeaves] = useState([]);
  const [error, setError] = useState('');

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
  const todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate());

  useEffect(() => {
    api.get(`/leaves/team?from=${iso(year, month, 1)}&to=${iso(year, month, daysInMonth)}`)
      .then(setLeaves)
      .catch((e) => setError(e.message));
  }, [year, month, daysInMonth]);

  const cells = useMemo(() => {
    const out = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = iso(year, month, d);
      const dow = (offset + d - 1) % 7;
      out.push({
        d, date, weekend: dow >= 5,
        who: leaves.filter((l) => l.start_date <= date && l.end_date >= date),
      });
    }
    return out;
  }, [leaves, year, month, daysInMonth, offset]);

  const shift = (delta) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); };
  const title = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' }).toLowerCase();
  const outToday = leaves.filter((l) => l.start_date <= todayIso && l.end_date >= todayIso);

  return (
    <section>
      <div className="cal-head">
        <h3>{title}</h3>
        <div className="cal-ctrl">
          <button onClick={() => shift(-1)} aria-label="Previous month">←</button>
          <button className="ghost" onClick={goToday}>today</button>
          <button onClick={() => shift(1)} aria-label="Next month">→</button>
        </div>
      </div>
      {outToday.length > 0 && (
        <p className="out-today">
          <span className="live" /> out today: {outToday.map((l) => l.user_name).join(', ')}
        </p>
      )}
      {error && <p className="error">{error}</p>}
      <div className="cal" key={`${year}-${month}`}>
        {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => (
          <div key={d} className="cal-dow">{d}</div>
        ))}
        {cells.map((c, i) => (
          <div key={i}
            className={`cal-cell ${c ? '' : 'empty'} ${c?.weekend ? 'weekend' : ''} ${c?.date === todayIso ? 'today' : ''}`}>
            {c && (
              <>
                <div className="cal-day">{c.d}</div>
                {c.who.map((l) => (
                  <div key={l.id} className="cal-chip" style={{ '--h': hueFor(l.user_name) }}
                    title={`${l.user_name} — ${l.leave_type}`}>
                    <span className="full">{l.user_name}</span>
                    <span className="short">{initials(l.user_name)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
      {leaves.length === 0 && !error && (
        <p className="muted center-text">nobody's out this month.</p>
      )}
    </section>
  );
}
