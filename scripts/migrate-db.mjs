import { AUTH_SCHEMA_STATEMENTS } from "../lib/auth/schema.ts";
import { connectDatabase, reportDatabaseError } from "./db-client.mjs";

try {
  const sql = connectDatabase();
  await sql.transaction(AUTH_SCHEMA_STATEMENTS.map((statement) => sql.query(statement)));
  console.log("Neon authentication schema is ready. Existing accounts and sessions were not changed.");
} catch (error) {
  reportDatabaseError("Database setup", error);
}
