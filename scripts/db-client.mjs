import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { neon } from "@neondatabase/serverless";
import { databaseUrl, DeploymentConfigurationError } from "../lib/auth/config.ts";

export function connectDatabase() {
  if (existsSync(".env.local")) loadEnvFile(".env.local");
  return neon(databaseUrl(), { fetchOptions: { cache: "no-store" } });
}

export function reportDatabaseError(operation, error) {
  if (error instanceof DeploymentConfigurationError) {
    console.error(error.message);
  } else {
    const code = typeof error?.code === "string" && /^[A-Z0-9]{5}$/.test(error.code) ? ` (database code ${error.code})` : "";
    console.error(`${operation} failed${code}. Check your Neon connection, schema setup, and database permissions. No credentials are printed.`);
  }
  process.exitCode = 1;
}
