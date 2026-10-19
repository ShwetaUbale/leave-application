import pg from 'pg';

// Return DATE columns as 'YYYY-MM-DD' strings instead of JS Date objects.
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgres://leave:leave@localhost:5433/leave',
});

export const query = (text, params) => pool.query(text, params);
export const one = async (text, params) => (await pool.query(text, params)).rows[0];
export const all = async (text, params) => (await pool.query(text, params)).rows;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('employee','manager','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS leave_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  days_per_year INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  leave_type_id INTEGER NOT NULL REFERENCES leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  reviewer_id INTEGER REFERENCES users(id),
  review_comment TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leave_requests_user_idx ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS leave_requests_status_idx ON leave_requests(status);
`;

// Retries so the API can start before the database container is ready.
export async function initDb(retries = 30) {
  for (let i = 0; ; i++) {
    try {
      await pool.query(SCHEMA);
      return;
    } catch (e) {
      if (i >= retries) throw e;
      console.log(`Waiting for database... (${e.code || e.message})`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}
