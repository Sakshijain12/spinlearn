export const AUTH_SCHEMA_STATEMENTS = [
  "CREATE SCHEMA IF NOT EXISTS spinlearn_auth",
  `CREATE TABLE IF NOT EXISTS spinlearn_auth.accounts (
    id UUID PRIMARY KEY,
    login_id TEXT NOT NULL UNIQUE CHECK (login_id = lower(login_id)),
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at BIGINT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS spinlearn_auth.sessions (
    token_hash TEXT PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES spinlearn_auth.accounts(id) ON DELETE CASCADE,
    expires_at BIGINT NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS sessions_expiry ON spinlearn_auth.sessions(expires_at)",
  `CREATE TABLE IF NOT EXISTS spinlearn_auth.auth_limits (
    key TEXT PRIMARY KEY,
    started_at BIGINT NOT NULL,
    attempts INTEGER NOT NULL CHECK (attempts > 0)
  )`,
];
