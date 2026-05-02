import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings — fine for personal use
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Fail fast on startup if DB is unreachable
pool.on('error', (err) => {
  console.error('[DB] Unexpected client error:', err.message);
});

/**
 * Run a parameterised query.
 * Usage: db.query('SELECT * FROM transactions WHERE id = $1', [id])
 */
export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DB] ${duration}ms — ${text.slice(0, 80)}`);
  }
  return res;
}

export default pool;
