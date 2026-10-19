import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { toast } from '../effects.js';
import { RequestTable } from './MyLeave.jsx';

export default function Approvals() {
  const [rows, setRows] = useState([]);
  const [comments, setComments] = useState({});
  const [error, setError] = useState('');

  const load = useCallback(
    () => api.get('/leaves/pending').then(setRows).catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => { load(); }, [load]);

  async function review(r, status) {
    setError('');
    try {
      await api.post(`/leaves/${r.id}/review`, { status, comment: comments[r.id] || '' });
      toast(`${status} · ${r.user_name}`);
      await load();
    } catch (err) {
      setError(err.message);
      toast(err.message, 'error');
      load();
    }
  }

  return (
    <section>
      <div className="section-head">
        <h3>approvals</h3>
        {rows.length > 0 && <span className="count">{rows.length}</span>}
      </div>
      {error && <p className="error shake">{error}</p>}
      <RequestTable rows={rows} showUser empty="inbox zero. nothing to review ✨"
        action={(r) => (
          <div className="review">
            <input placeholder="comment (optional)" value={comments[r.id] || ''}
              onChange={(e) => setComments({ ...comments, [r.id]: e.target.value })} />
            <button className="primary" onClick={() => review(r, 'approved')}>approve</button>
            <button className="danger" onClick={() => review(r, 'rejected')}>decline</button>
          </div>
        )} />
    </section>
  );
}
