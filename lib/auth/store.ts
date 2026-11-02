import { createHash, randomBytes, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { accountSchema, type Account } from "./validation";
import { databaseUrl } from "./config";

export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export type AuthQuery = (text: string, values?: unknown[]) => Promise<Record<string, unknown>[]>;

export function newSession() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: tokenHash(token), expires: Date.now() + SESSION_SECONDS * 1000 };
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class AuthStore {
  constructor(private readonly query: AuthQuery) {}

  async register(
    loginId: string,
    displayName: string,
    passwordHash: string,
    session: ReturnType<typeof newSession>,
    previousToken?: string
  ): Promise<Account | null> {
    const rows = await this.query(`
      WITH new_account AS (
        INSERT INTO spinlearn_auth.accounts (id, login_id, display_name, password_hash, created_at)
        VALUES ($1, lower($2), $3, $4, $5)
        ON CONFLICT (login_id) DO NOTHING
        RETURNING id, login_id AS "loginId", display_name AS "displayName"
      ), new_session AS (
        INSERT INTO spinlearn_auth.sessions (token_hash, account_id, expires_at)
        SELECT $6, id, $7 FROM new_account
        RETURNING account_id
      ), revoked AS (
        DELETE FROM spinlearn_auth.sessions
        WHERE token_hash = $8 AND EXISTS (SELECT 1 FROM new_account)
      )
      SELECT a.id, a."loginId", a."displayName"
      FROM new_account a JOIN new_session s ON a.id = s.account_id
    `, [randomUUID(), loginId, displayName, passwordHash, Date.now(), session.hash, session.expires,
      previousToken ? tokenHash(previousToken) : null]);
    return rows[0] ? accountSchema.parse(rows[0]) : null;
  }

  async credentials(loginId: string): Promise<{ account: Account; passwordHash: string } | null> {
    const [row] = await this.query(`
      SELECT id, login_id AS "loginId", display_name AS "displayName", password_hash
      FROM spinlearn_auth.accounts WHERE login_id = lower($1)
    `, [loginId]);
    if (!row) return null;
    if (typeof row.password_hash !== "string") throw new Error("Invalid account credentials in storage.");
    return { account: accountSchema.parse(row), passwordHash: row.password_hash };
  }

  async createSession(accountId: string, session: ReturnType<typeof newSession>, previousToken?: string) {
    await this.query(`
      WITH revoked AS (
        DELETE FROM spinlearn_auth.sessions
        WHERE token_hash = $1 OR expires_at <= $2
      )
      INSERT INTO spinlearn_auth.sessions (token_hash, account_id, expires_at)
      VALUES ($3, $4, $5)
    `, [previousToken ? tokenHash(previousToken) : null, Date.now(), session.hash, accountId, session.expires]);
  }

  async accountForSession(token: string, now = Date.now()): Promise<Account | null> {
    if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) return null;
    const [row] = await this.query(`
      SELECT a.id, a.login_id AS "loginId", a.display_name AS "displayName"
      FROM spinlearn_auth.sessions s JOIN spinlearn_auth.accounts a ON a.id = s.account_id
      WHERE s.token_hash = $1 AND s.expires_at > $2
    `, [tokenHash(token), now]);
    return row ? accountSchema.parse(row) : null;
  }

  async revoke(token: string) {
    await this.query("DELETE FROM spinlearn_auth.sessions WHERE token_hash = $1", [tokenHash(token)]);
  }

  async takeAttempt(key: string, limit: number, windowMs: number, now = Date.now()): Promise<boolean> {
    const [row] = await this.query(`
      WITH expired AS (
        DELETE FROM spinlearn_auth.auth_limits WHERE started_at < $4 AND key <> $1
      )
      INSERT INTO spinlearn_auth.auth_limits AS limits (key, started_at, attempts)
      VALUES ($1, $2, 1)
      ON CONFLICT (key) DO UPDATE SET
        attempts = CASE WHEN limits.started_at <= $3 THEN 1 ELSE limits.attempts + 1 END,
        started_at = CASE WHEN limits.started_at <= $3 THEN EXCLUDED.started_at ELSE limits.started_at END
      RETURNING attempts
    `, [key, now, now - windowMs, now - 24 * 60 * 60 * 1000]);
    if (!row || typeof row.attempts !== "number") throw new Error("Could not check authentication rate limit.");
    return row.attempts <= limit;
  }

  async clearAttempts(key: string) {
    await this.query("DELETE FROM spinlearn_auth.auth_limits WHERE key = $1", [key]);
  }
}

let store: AuthStore | undefined;

export function getAuthStore(): AuthStore {
  if (!store) {
    const sql = neon(databaseUrl(), { fetchOptions: { cache: "no-store" } });
    store = new AuthStore(async (text, values = []) =>
      sql.query(text, values, { fetchOptions: { signal: AbortSignal.timeout(15000) } }));
  }
  return store;
}
