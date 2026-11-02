import { afterEach, describe, expect, it, vi } from "vitest";
import { databaseUrl, trustedAuthOrigin } from "./config";

describe("Neon connection configuration", () => {
  it("requires a connection string without revealing it in errors", () => {
    expect(() => databaseUrl({})).toThrow("Set DATABASE_URL");
    expect(() => databaseUrl({ DATABASE_URL: "not-a-url" })).toThrow("valid PostgreSQL");
    expect(() => databaseUrl({ DATABASE_URL: "postgresql://u:private@host/db?sslmode=disable" })).toThrow("sslmode=require");
    expect(() => databaseUrl({ DATABASE_URL: "postgresql://u:private@host/db?sslmode=disable" })).not.toThrow("private");
  });

  it("accepts TLS-required Neon connection strings without rewriting credentials", () => {
    const value = "postgresql://test:encoded%40password@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
    expect(databaseUrl({ DATABASE_URL: value })).toBe(value);
    expect(() => databaseUrl({ DATABASE_URL: "https://u:p@host/db?sslmode=require" })).toThrow();
    expect(() => databaseUrl({ DATABASE_URL: "postgresql://u:p@host/?sslmode=require" })).toThrow();
  });
});

describe("trusted deployment origins", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts the configured production domain behind a reverse proxy, not forwarded-header guesses", () => {
    const env = { NODE_ENV: "production", APP_URL: "https://learn.example.com" };
    expect(trustedAuthOrigin("https://learn.example.com", "http://internal:3000", env)).toBe(true);
    expect(trustedAuthOrigin("https://attacker.example.com", "https://attacker.example.com", env)).toBe(false);
    expect(trustedAuthOrigin("https://learn.example.com.evil.test", "http://internal:3000", env)).toBe(false);
  });

  it("allows only this exact Vercel deployment and branch, not arbitrary vercel.app sites", () => {
    const env = {
      VERCEL: "1", NODE_ENV: "production", VERCEL_ENV: "preview",
      VERCEL_URL: "spinlearn-abc-team.vercel.app", VERCEL_BRANCH_URL: "spinlearn-git-feature-team.vercel.app",
      VERCEL_PROJECT_PRODUCTION_URL: "spinlearn.vercel.app",
    };
    expect(trustedAuthOrigin("https://spinlearn-abc-team.vercel.app", "http://internal", env)).toBe(true);
    expect(trustedAuthOrigin("https://spinlearn-git-feature-team.vercel.app", "http://internal", env)).toBe(true);
    expect(trustedAuthOrigin("https://unrelated.vercel.app", "http://internal", env)).toBe(false);
    expect(trustedAuthOrigin("https://spinlearn.vercel.app", "http://internal", env)).toBe(false);
    expect(trustedAuthOrigin("https://spinlearn.vercel.app", "http://internal", { ...env, VERCEL_ENV: "production" })).toBe(true);
  });

  it("rejects malformed, opaque, or missing origins and missing production configuration", () => {
    const env = { NODE_ENV: "production", APP_URL: "https://learn.example.com" };
    expect(trustedAuthOrigin(null, "http://internal", env)).toBe(false);
    expect(trustedAuthOrigin("null", "http://internal", env)).toBe(false);
    expect(trustedAuthOrigin("https://learn.example.com/path", "http://internal", env)).toBe(false);
    expect(() => trustedAuthOrigin("https://learn.example.com", "http://internal", { NODE_ENV: "production" })).toThrow("Set APP_URL");
    expect(() => trustedAuthOrigin("http://learn.example.com", "http://internal", { APP_URL: "http://learn.example.com" })).toThrow("HTTPS");
    expect(() => trustedAuthOrigin("https://learn.example.com", "http://internal", { APP_URL: "https://learn.example.com/path" })).toThrow();
  });

  it("supports local development and explicitly configured local production tests", () => {
    expect(trustedAuthOrigin("http://localhost:3000", "http://localhost:3000", { NODE_ENV: "development" })).toBe(true);
    expect(trustedAuthOrigin("http://localhost:3100", "http://internal", { NODE_ENV: "production", APP_URL: "http://localhost:3100" })).toBe(true);
    expect(trustedAuthOrigin("http://localhost:3001", "http://localhost:3000", { NODE_ENV: "development" })).toBe(false);
  });
});
