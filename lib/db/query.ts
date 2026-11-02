import { neon } from "@neondatabase/serverless";
import { databaseUrl } from "../auth/config";

export type DatabaseQuery = (text: string, values?: unknown[]) => Promise<Record<string, unknown>[]>;
let query: DatabaseQuery | undefined;

export function getDatabaseQuery(): DatabaseQuery {
  if (!query) {
    const sql = neon(databaseUrl(), { fetchOptions: { cache: "no-store" } });
    query = async (text, values = []) =>
      sql.query(text, values, { fetchOptions: { signal: AbortSignal.timeout(15000) } });
  }
  return query;
}
