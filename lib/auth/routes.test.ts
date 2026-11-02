import { randomBytes } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "../../app/api/auth/[action]/route";
import { testAuthDatabase } from "./postgres-test-helper";
import { SESSION_COOKIE } from "./session";

const context = vi.hoisted(() => ({ store: undefined as ReturnType<typeof import("./store")["getAuthStore"]> | undefined }));
vi.mock("./store", async (original) => {
  const actual = await original<typeof import("./store")>();
  return { ...actual, getAuthStore: () => {
    if (!context.store) throw new Error("Test database was not initialized.");
    return context.store;
  } };
});

function post(action: string, body?: unknown, cookie?: string, origin = "https://spinlearn.example.com") {
  const headers = new Headers({ origin, "content-type": "application/json" });
  if (cookie) headers.set("cookie", cookie);
  return POST(new NextRequest(`http://internal:3000/api/auth/${action}`, {
    method: "POST", headers, body: JSON.stringify(body ?? {}),
  }), { params: Promise.resolve({ action }) });
}

function session(cookie: string) {
  return GET(new NextRequest("http://internal:3000/api/auth/session", { headers: { cookie } }),
    { params: Promise.resolve({ action: "session" }) });
}

describe("auth endpoints backed by PostgreSQL", () => {
  let database: Awaited<ReturnType<typeof testAuthDatabase>>;
  beforeAll(async () => {
    database = await testAuthDatabase();
    context.store = database.store;
    vi.stubEnv("APP_URL", "https://spinlearn.example.com");
    vi.stubEnv("NODE_ENV", "production");
  }, 30000);
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => { vi.unstubAllEnvs(); await database?.db.close(); });

  it("registers, persists, logs in, rejects wrong credentials and revokes a cookie session", async () => {
    const password = randomBytes(24).toString("base64url");
    const created = await post("register", { loginId: "route-learner", displayName: "Learner", password, confirmPassword: password });
    expect(created.status).toBe(201);
    const createdBody = await created.json();
    expect(createdBody.account.loginId).toBe("route-learner");
    expect(JSON.stringify(createdBody)).not.toContain(password);
    const cookie = created.cookies.get(SESSION_COOKIE)!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.secure).toBe(true);
    expect(cookie.sameSite).toBe("lax");
    expect(created.headers.get("cache-control")).toBe("no-store");
    const cookieHeader = `${SESSION_COOKIE}=${cookie.value}`;
    expect((await session(cookieHeader)).status).toBe(200);

    const wrong = await post("login", { loginId: "route-learner", password: `${password}wrong` });
    expect(wrong.status).toBe(401);
    expect(wrong.cookies.get(SESSION_COOKIE)).toBeUndefined();
    const duplicate = await post("register", { loginId: "ROUTE-LEARNER", displayName: "Other", password, confirmPassword: password });
    expect(duplicate.status).toBe(409);

    const login = await post("login", { loginId: "ROUTE-LEARNER", password }, cookieHeader);
    expect(login.status).toBe(200);
    const replacement = `${SESSION_COOKIE}=${login.cookies.get(SESSION_COOKIE)!.value}`;
    expect(replacement).not.toBe(cookieHeader);
    expect((await session(cookieHeader)).status).toBe(401);
    expect((await session(replacement)).status).toBe(200);
    const logout = await post("logout", {}, replacement);
    expect(logout.status).toBe(200);
    expect(logout.cookies.get(SESSION_COOKIE)?.maxAge).toBe(0);
    expect((await session(replacement)).status).toBe(401);
  }, 20000);

  it("does not authenticate when an awaited database write fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(database.store, "revoke").mockRejectedValue(new Error("Database unavailable"));
    const response = await post("logout", {}, `${SESSION_COOKIE}=${randomBytes(32).toString("base64url")}`);
    expect(response.status).toBe(500);
    expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
    expect(log).toHaveBeenCalled();
  });

  it("awaits shared rate-limit state rather than treating a Promise as an allowed attempt", async () => {
    vi.spyOn(database.store, "takeAttempt").mockResolvedValue(false);
    const response = await post("login", { loginId: "rate-limited", password: "test-password" });
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("900");
  });

  it("rejects untrusted origins before accessing account records", async () => {
    const credentials = vi.spyOn(database.store, "credentials");
    const response = await post("login", { loginId: "route-learner", password: "irrelevant" }, undefined, "https://different.vercel.app");
    expect(response.status).toBe(403);
    expect(credentials).not.toHaveBeenCalled();
  });
});
