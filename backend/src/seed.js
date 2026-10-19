import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { pool, one, query, initDb } from './db.js';

// Idempotent: only inserts when the tables are empty.
export async function seed() {
  if ((await one('SELECT COUNT(*)::int AS n FROM leave_types')).n === 0) {
    for (const [name, days] of [['Annual', 20], ['Sick', 10], ['Casual', 5], ['Unpaid', 30]]) {
      await query('INSERT INTO leave_types (name, days_per_year) VALUES ($1, $2)', [name, days]);
    }
  }
  if ((await one('SELECT COUNT(*)::int AS n FROM users')).n === 0) {
    const users = [
      ['Shweta', 'admin@example.com', 'admin123', 'admin'],
      ['Dhyanu', 'manager@example.com', 'manager123', 'manager'],
      ['Suhas', 'employee@example.com', 'employee123', 'employee'],
    ];
    for (const [name, email, pw, role] of users) {
      await query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        [name, email, bcrypt.hashSync(pw, 10), role],
      );
    }
    console.log('Seeded demo users: admin@example.com / manager@example.com / employee@example.com');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await initDb();
  await seed();
  await pool.end();
  console.log('Seed complete');
}
