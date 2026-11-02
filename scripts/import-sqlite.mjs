import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { EMPTY_IMPORT_TARGET, IMPORT_ACCOUNT_SQL, validateLegacyAccount } from "../lib/auth/legacy-import.ts";
import { connectDatabase, reportDatabaseError } from "./db-client.mjs";

const args = process.argv.slice(2);
if (args.length !== 3 || args[0] !== "--source" || args[2] !== "--confirm") {
  console.error("Usage: npm run db:import-sqlite -- --source <SQLite file> --confirm");
  console.error("This explicitly uploads account IDs and password hashes to DATABASE_URL. Run only against your own empty Neon database.");
  process.exitCode = 1;
} else if (!existsSync(resolve(args[1]))) {
  console.error("The source SQLite file does not exist. Nothing was imported.");
  process.exitCode = 1;
} else {
  let source;
  try {
    source = new DatabaseSync(resolve(args[1]), { readOnly: true });
    const accounts = source.prepare("SELECT id, login_id, display_name, password_hash, created_at FROM accounts").all()
      .map(validateLegacyAccount);
    if (!accounts.length) {
      console.log("The source has no accounts. Nothing was imported.");
    } else {
      const sql = connectDatabase();
      await sql.transaction([
        sql`LOCK TABLE spinlearn_auth.accounts IN EXCLUSIVE MODE`,
        sql.query(EMPTY_IMPORT_TARGET),
        ...accounts.map((account) => sql.query(IMPORT_ACCOUNT_SQL, [
          account.id, account.loginId, account.displayName, account.passwordHash, account.createdAt,
        ])),
      ]);
      console.log(`Imported ${accounts.length} accounts without changing IDs or password hashes. Sign in again on the new site.`);
      console.log("The source file was not modified. Sessions and rate-limit records were not copied.");
    }
  } catch (error) {
    reportDatabaseError("Account import (target must be empty; run npm run db:migrate first)", error);
  } finally {
    source?.close();
  }
}
