import { AUTH_SCHEMA_STATEMENTS } from "../lib/auth/schema.ts";
import { connectDatabase, reportDatabaseError } from "./db-client.mjs";

try {
  const sql = connectDatabase();
  await sql.transaction(AUTH_SCHEMA_STATEMENTS.map((statement) => sql.query(statement)));
  console.log("Neon account and learning-progress schema is ready. Existing accounts, sessions, and progress were not changed.");
} catch (error) {
  reportDatabaseError("Database setup", error);
}
