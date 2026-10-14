CREATE TABLE IF NOT EXISTS monthly_statistics (
  month DATE NOT NULL,
  department TEXT NOT NULL CHECK (department IN ('Sales', 'Engineering', 'Marketing', 'Operations')),
  revenue NUMERIC(14, 2) NOT NULL CHECK (revenue >= 0),
  expenses NUMERIC(14, 2) NOT NULL CHECK (expenses >= 0),
  sales INTEGER NOT NULL CHECK (sales >= 0),
  employees INTEGER NOT NULL CHECK (employees >= 0),
  PRIMARY KEY (month, department)
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at);
