import { PGlite } from "@electric-sql/pglite";
import { AUTH_SCHEMA_STATEMENTS } from "./schema";
import { AuthStore, type AuthQuery } from "./store";

export async function testAuthDatabase() {
  const db = new PGlite();
  for (const statement of AUTH_SCHEMA_STATEMENTS) await db.exec(statement);
  const query: AuthQuery = async (text, values = []) => (await db.query<Record<string, unknown>>(text, values)).rows;
  return { db, query, store: new AuthStore(query) };
}
