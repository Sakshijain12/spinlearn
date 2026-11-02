export const EMPTY_IMPORT_TARGET = `
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM spinlearn_auth.accounts) THEN
      RAISE EXCEPTION 'Account import requires an empty target database';
    END IF;
  END $$`;

export const IMPORT_ACCOUNT_SQL = `
  INSERT INTO spinlearn_auth.accounts (id, login_id, display_name, password_hash, created_at)
  VALUES ($1, $2, $3, $4, $5)`;

export interface LegacyAccount {
  id: string;
  loginId: string;
  displayName: string;
  passwordHash: string;
  createdAt: number;
}

export function validateLegacyAccount(row: Record<string, unknown>): LegacyAccount {
  if (
    typeof row.id !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(row.id)
    || typeof row.login_id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9@._-]{2,63}$/.test(row.login_id)
    || typeof row.display_name !== "string" || row.display_name.length < 1 || row.display_name.length > 40
    || typeof row.password_hash !== "string" || !/^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{128}$/.test(row.password_hash)
    || typeof row.created_at !== "number" || !Number.isSafeInteger(row.created_at)
  ) {
    throw new Error("The SQLite file contains an unsupported account record. No accounts were imported.");
  }
  return {
    id: row.id, loginId: row.login_id.toLowerCase(), displayName: row.display_name,
    passwordHash: row.password_hash, createdAt: row.created_at,
  };
}
