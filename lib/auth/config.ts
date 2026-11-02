type Environment = Record<string, string | undefined>;

export class DeploymentConfigurationError extends Error {}

export function databaseUrl(env: Environment = process.env): string {
  const value = env.DATABASE_URL?.trim();
  if (!value) throw new DeploymentConfigurationError("Set DATABASE_URL to your Neon connection string before using account services.");
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new DeploymentConfigurationError("DATABASE_URL must be a valid PostgreSQL connection string.");
  }
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol)
    || !parsed.username || !parsed.password || !parsed.hostname
    || parsed.pathname.length < 2 || parsed.hash
    || !["require", "verify-ca", "verify-full"].includes(parsed.searchParams.get("sslmode") ?? "")
  ) {
    throw new DeploymentConfigurationError("DATABASE_URL must include PostgreSQL credentials, host, database, and sslmode=require (or stricter).");
  }
  return value;
}

function applicationOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new DeploymentConfigurationError("APP_URL must be a complete HTTPS origin without a path.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(local && url.protocol === "http:"))
    || url.username || url.password || url.pathname !== "/" || url.search || url.hash
  ) {
    throw new DeploymentConfigurationError("APP_URL must be an HTTPS origin; HTTP is permitted only on localhost.");
  }
  return url.origin;
}

function vercelOrigin(host: string): string {
  if (!/^[a-zA-Z0-9.-]+$/.test(host)) throw new DeploymentConfigurationError("A Vercel deployment hostname is invalid.");
  return applicationOrigin(`https://${host}`);
}

export function trustedAuthOrigin(origin: string | null, requestOrigin: string, env: Environment = process.env): boolean {
  if (!origin || origin === "null") return false;
  const allowed = new Set<string>();
  if (env.APP_URL) allowed.add(applicationOrigin(env.APP_URL));
  if (env.VERCEL === "1") {
    for (const host of [env.VERCEL_URL, env.VERCEL_BRANCH_URL]) {
      if (host) allowed.add(vercelOrigin(host));
    }
    if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL) {
      allowed.add(vercelOrigin(env.VERCEL_PROJECT_PRODUCTION_URL));
    }
  } else if (env.NODE_ENV !== "production") {
    allowed.add(new URL(requestOrigin).origin);
  }
  if (allowed.size === 0) {
    throw new DeploymentConfigurationError("Set APP_URL for a production server, or enable Vercel's system environment variables.");
  }
  return allowed.has(origin);
}
