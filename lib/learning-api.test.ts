import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../app/api/v1/learning/route";
import { testAuthDatabase } from "./auth/postgres-test-helper";
import { newSession } from "./auth/store";
import { LearningStore } from "./learning-store";
import type { Account } from "./auth/validation";

const mocked = vi.hoisted(() => ({
  account: null as Account | null,
  store: undefined as LearningStore | undefined,
}));
vi.mock("./auth/session", () => ({ currentAccount: async () => mocked.account }));
vi.mock("./learning-store", async (original) => {
  const actual = await original<typeof import("./learning-store")>();
  return { ...actual, getLearningStore: () => mocked.store };
});

describe("authenticated progress endpoints", () => {
  let database: Awaited<ReturnType<typeof testAuthDatabase>>;
  beforeAll(async () => {
    database = await testAuthDatabase();
    mocked.store = new LearningStore(database.query);
    vi.stubEnv("APP_URL", "https://spinlearn.example.com");
  }, 30000);
  afterAll(async () => { vi.unstubAllEnvs(); await database?.db.close(); });

  it("refuses anonymous access and ignores another account ID in the body", async () => {
    mocked.account = null;
    expect((await GET()).status).toBe(401);
    const owner = await database.store.register("api-progress", "Learner", "test-hash", newSession());
    if (!owner) throw new Error("Account was not created");
    mocked.account = owner;
    const request = new NextRequest("https://spinlearn.example.com/api/v1/learning", {
      method: "POST", headers: { Origin: "https://spinlearn.example.com", "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: randomUUID(), requestId: randomUUID(), action: { type: "reset" }, expectedRevision: 0 }),
    });
    expect((await POST(request)).status).toBe(409);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const data = await response.json();
    expect(data.accountId).toBe(owner.id);
    expect(data.revision).toBe(0);
  });

  it("blocks cross-origin writes and accepts an account-scoped, validated mutation", async () => {
    const owner = mocked.account!;
    const body = JSON.stringify({ accountId: owner.id, requestId: randomUUID(), action: { type: "bookmark", slug: "lora", saved: true } });
    const make = (origin: string) => new NextRequest("https://spinlearn.example.com/api/v1/learning", {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body,
    });
    expect((await POST(make("https://other.invalid"))).status).toBe(403);
    const response = await POST(make("https://spinlearn.example.com"));
    expect(response.status).toBe(200);
    expect((await response.json()).state.bookmarks).toEqual(["lora"]);
  });
});
