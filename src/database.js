import pg from 'pg';

const { Pool } = pg;
export const databaseEnabled = Boolean(process.env.DATABASE_URL);
export const pool = databaseEnabled ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}) : null;

export async function initialiseDatabase() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS businesses (
      id BIGSERIAL PRIMARY KEY,
      owner_id BIGINT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'salon',
      phone TEXT DEFAULT '', address TEXT DEFAULT '', hours TEXT DEFAULT '',
      language TEXT DEFAULT 'en-US', plan TEXT DEFAULT 'trial',
      subscription_status TEXT DEFAULT 'trial', trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS services (
      id BIGSERIAL PRIMARY KEY,
      business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
      name TEXT NOT NULL, duration_minutes INTEGER NOT NULL DEFAULT 30,
      price_pkr INTEGER NOT NULL DEFAULT 0, active BOOLEAN DEFAULT TRUE
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id BIGSERIAL PRIMARY KEY,
      business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
      customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL,
      service_name TEXT NOT NULL, booking_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS payment_requests (
      id BIGSERIAL PRIMARY KEY,
      business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
      plan TEXT NOT NULL, method TEXT NOT NULL, transaction_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS bookings_business_date ON bookings(business_id, booking_at);
  `);
}

export async function query(text, values = []) {
  if (!pool) throw Object.assign(new Error('Database is not configured.'), { status: 503 });
  return pool.query(text, values);
}
