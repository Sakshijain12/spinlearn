import { connectDatabase, reportDatabaseError } from "./db-client.mjs";

try {
  const sql = connectDatabase();
  await sql.transaction([
    sql`SELECT id, login_id, display_name, password_hash, created_at FROM spinlearn_auth.accounts LIMIT 0`,
    sql`SELECT token_hash, account_id, expires_at FROM spinlearn_auth.sessions LIMIT 0`,
    sql`SELECT key, started_at, attempts FROM spinlearn_auth.auth_limits LIMIT 0`,
    sql`SELECT account_id, payload, revision, mutation_ids, updated_at FROM spinlearn_auth.learning_state LIMIT 0`,
  ]);
  console.log("Neon is reachable and all required account and learning-progress tables are available.");
} catch (error) {
  reportDatabaseError("Database check (run npm run db:migrate first)", error);
}
