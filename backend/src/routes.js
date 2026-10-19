import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { one, all, query } from './db.js';
import { signToken, requireAuth, requireRole } from './auth.js';
import { parseDate, countWeekdays } from './dates.js';

export const router = Router();

// Express 4 doesn't catch rejected promises; forward them to the error handler.
const h = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const REQUEST_SELECT = `
  SELECT r.*, u.name AS user_name, t.name AS leave_type, rv.name AS reviewer_name
  FROM leave_requests r
  JOIN users u ON u.id = r.user_id
  JOIN leave_types t ON t.id = r.leave_type_id
  LEFT JOIN users rv ON rv.id = r.reviewer_id`;

// ---- auth ----
router.post('/auth/login', h(async (req, res) => {
  const { email, password } = req.body || {};
  const row = await one('SELECT * FROM users WHERE email = $1', [String(email || '').trim().toLowerCase()]);
  if (!row || !bcrypt.compareSync(String(password || ''), row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const { password_hash, ...user } = row;
  res.json({ token: signToken(user), user });
}));

router.get('/auth/me', requireAuth, (req, res) => res.json(req.user));

// ---- reference data ----
router.get('/leave-types', requireAuth, h(async (_req, res) =>
  res.json(await all('SELECT * FROM leave_types ORDER BY name'))));

router.get('/balance', requireAuth, h(async (req, res) => {
  const year = new Date().getFullYear();
  const rows = await all(`
    SELECT t.id, t.name, t.days_per_year,
      COALESCE(SUM(r.days) FILTER (WHERE r.status = 'approved'), 0)::int AS used,
      COALESCE(SUM(r.days) FILTER (WHERE r.status = 'pending'), 0)::int AS pending
    FROM leave_types t
    LEFT JOIN leave_requests r
      ON r.leave_type_id = t.id AND r.user_id = $1
      AND EXTRACT(YEAR FROM r.start_date) = $2
    GROUP BY t.id ORDER BY t.name`, [req.user.id, year]);
  res.json(rows.map((r) => ({ ...r, remaining: r.days_per_year - r.used - r.pending })));
}));

// ---- leave requests ----
router.get('/leaves/mine', requireAuth, h(async (req, res) =>
  res.json(await all(`${REQUEST_SELECT} WHERE r.user_id = $1 ORDER BY r.start_date DESC`, [req.user.id]))));

router.post('/leaves', requireAuth, h(async (req, res) => {
  const { leave_type_id, start_date, end_date, reason } = req.body || {};
  const start = parseDate(start_date);
  const end = parseDate(end_date);
  if (!start || !end) return res.status(400).json({ error: 'Valid start and end dates (YYYY-MM-DD) are required' });
  if (end < start) return res.status(400).json({ error: 'End date cannot be before start date' });
  if (start_date.slice(0, 4) !== end_date.slice(0, 4)) {
    return res.status(400).json({ error: 'Leave cannot span two calendar years; submit separate requests' });
  }
  const type = await one('SELECT * FROM leave_types WHERE id = $1', [Number(leave_type_id) || 0]);
  if (!type) return res.status(400).json({ error: 'Unknown leave type' });

  const days = countWeekdays(start, end);
  if (days === 0) return res.status(400).json({ error: 'Selected range contains no working days' });

  const overlap = await one(`
    SELECT 1 FROM leave_requests
    WHERE user_id = $1 AND status IN ('pending','approved')
      AND start_date <= $2 AND end_date >= $3`, [req.user.id, end_date, start_date]);
  if (overlap) return res.status(409).json({ error: 'You already have leave overlapping these dates' });

  const { used } = await one(`
    SELECT COALESCE(SUM(days), 0)::int AS used FROM leave_requests
    WHERE user_id = $1 AND leave_type_id = $2 AND status IN ('pending','approved')
      AND EXTRACT(YEAR FROM start_date) = $3`, [req.user.id, type.id, Number(start_date.slice(0, 4))]);
  if (used + days > type.days_per_year) {
    return res.status(400).json({
      error: `Insufficient ${type.name} balance: ${type.days_per_year - used} day(s) left, ${days} requested`,
    });
  }

  const { id } = await one(`
    INSERT INTO leave_requests (user_id, leave_type_id, start_date, end_date, days, reason)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
  [req.user.id, type.id, start_date, end_date, days, String(reason || '').slice(0, 500)]);
  res.status(201).json(await one(`${REQUEST_SELECT} WHERE r.id = $1`, [id]));
}));

router.post('/leaves/:id/cancel', requireAuth, h(async (req, res) => {
  const row = await one('SELECT * FROM leave_requests WHERE id = $1', [Number(req.params.id) || 0]);
  if (!row || row.user_id !== req.user.id) return res.status(404).json({ error: 'Request not found' });
  if (!['pending', 'approved'].includes(row.status)) {
    return res.status(400).json({ error: `Cannot cancel a ${row.status} request` });
  }
  await query("UPDATE leave_requests SET status = 'cancelled' WHERE id = $1", [row.id]);
  res.json({ ok: true });
}));

// ---- manager / admin ----
router.get('/leaves/pending', requireAuth, requireRole('manager', 'admin'), h(async (req, res) =>
  res.json(await all(
    `${REQUEST_SELECT} WHERE r.status = 'pending' AND r.user_id <> $1 ORDER BY r.start_date`,
    [req.user.id],
  ))));

// Approved leave for the team calendar; optional ?from=&to= (YYYY-MM-DD) window.
router.get('/leaves/team', requireAuth, h(async (req, res) => {
  const from = parseDate(req.query.from) ? req.query.from : '0001-01-01';
  const to = parseDate(req.query.to) ? req.query.to : '9999-12-31';
  res.json(await all(`${REQUEST_SELECT}
    WHERE r.status = 'approved' AND r.start_date <= $1 AND r.end_date >= $2
    ORDER BY r.start_date`, [to, from]));
}));

router.post('/leaves/:id/review', requireAuth, requireRole('manager', 'admin'), h(async (req, res) => {
  const { status, comment } = req.body || {};
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
  }
  const row = await one('SELECT * FROM leave_requests WHERE id = $1', [Number(req.params.id) || 0]);
  if (!row) return res.status(404).json({ error: 'Request not found' });
  if (row.user_id === req.user.id) return res.status(403).json({ error: 'You cannot review your own request' });
  // Conditional update guards against two reviewers acting on the same request.
  const done = await query(`
    UPDATE leave_requests
    SET status = $1, reviewer_id = $2, review_comment = $3, reviewed_at = now()
    WHERE id = $4 AND status = 'pending'`,
  [status, req.user.id, String(comment || '').slice(0, 500), row.id]);
  if (done.rowCount === 0) return res.status(400).json({ error: `Request is already ${row.status === 'pending' ? 'reviewed' : row.status}` });
  res.json(await one(`${REQUEST_SELECT} WHERE r.id = $1`, [row.id]));
}));

// ---- admin: users ----
router.get('/users', requireAuth, requireRole('admin'), h(async (_req, res) =>
  res.json(await all('SELECT id, name, email, role, created_at FROM users ORDER BY name'))));

router.post('/users', requireAuth, requireRole('admin'), h(async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!['employee', 'manager', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const user = await one(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [String(name).trim(), String(email).trim().toLowerCase(), bcrypt.hashSync(String(password), 10), role],
    );
    res.status(201).json(user);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    throw e;
  }
}));
