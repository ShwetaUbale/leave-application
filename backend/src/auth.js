import jwt from 'jsonwebtoken';
import { one } from './db.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export const signToken = (user) =>
  jwt.sign({ id: user.id }, SECRET, { expiresIn: '8h' });

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  let id;
  try {
    ({ id } = jwt.verify(token, SECRET));
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  try {
    const user = await one('SELECT id, name, email, role FROM users WHERE id = $1', [id]);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ error: 'Forbidden' });
