import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./passwords";
import { AuthStore, newSession } from "./store";
import { loginSchema, registrationSchema } from "./validation";
import { testAuthDatabase } from "./postgres-test-helper";
import { AUTH_SCHEMA_STATEMENTS } from "./schema";
import { EMPTY_IMPORT_TARGET, IMPORT_ACCOUNT_SQL, validateLegacyAccount } from "./legacy-import";

describe("credential validation", () => {
  it("normalizes login IDs but never trims passwords", () => {
    const result = loginSchema.parse({ loginId: "  Learner.One  ", password: " password with spaces " });
    expect(result).toEqual({ loginId: "learner.one", password: " password with spaces " });
  });

  it("rejects short passwords and mismatched confirmations", () => {
    const password = randomBytes(18).toString("base64url");
    const input = { loginId: "learner", displayName: "Learner", password, confirmPassword: password };
    expect(registrationSchema.safeParse(input).success).toBe(true);
    expect(registrationSchema.safeParse({ ...input, password: "short", confirmPassword: "short" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...input, confirmPassword: `${password}other` }).success).toBe(false);
    expect(loginSchema.safeParse({ loginId: "../user", password }).success).toBe(false);
  });
});

describe("password storage", () => {
  it("uses independent salts and verifies only the matching password", async () => {
    const password = randomBytes(18).toString("base64url");
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).not.toBe(second);
    expect(first).not.toContain(password);
    expect(await verifyPassword(password, first)).toBe(true);
    expect(await verifyPassword(`${password}-wrong`, first)).toBe(false);
    expect(await verifyPassword(password, null)).toBe(false);
  }, 20000);

  it("reports corrupted hash data rather than accepting a fallback", async () => {
    await expect(verifyPassword("irrelevant", "broken")).rejects.toThrow("unsupported format");
  });
});

describe("durable accounts and revocable sessions", () => {
  let database: Awaited<ReturnType<typeof testAuthDatabase>>;
  beforeAll(async () => { database = await testAuthDatabase(); }, 30000);
  afterAll(async () => { await database?.db.close(); });

  it("persists accounts across store instances and supports expiry, rotation, and logout", async () => {
      const first = database.store;
      const session = newSession();
      const account = await first.register("learner", "Learner", "test-hash", session);
      expect(account).not.toBeNull();
      expect(await first.register("LEARNER", "Other", "test-hash", newSession())).toBeNull();
      expect(await first.accountForSession(session.token)).toEqual(account);
      expect(await first.accountForSession("invalid-token")).toBeNull();
      expect(await first.accountForSession(session.token, session.expires + 1)).toBeNull();
      const second = new AuthStore(database.query);
      expect((await second.credentials("LEARNER"))?.account).toEqual(account);
      const replacement = newSession();
      await second.createSession(account!.id, replacement, session.token);
      expect(await first.accountForSession(session.token)).toBeNull();
      expect(await first.accountForSession(replacement.token)).toEqual(account);
      await first.revoke(replacement.token);
      expect(await second.accountForSession(replacement.token)).toBeNull();
  });

  it("enforces attempt limits at the threshold and resets expired windows", async () => {
      const { store } = database;
      expect(await store.takeAttempt("login:test", 2, 1000, 10000)).toBe(true);
      expect(await store.takeAttempt("login:test", 2, 1000, 10001)).toBe(true);
      expect(await store.takeAttempt("login:test", 2, 1000, 10002)).toBe(false);
      expect(await store.takeAttempt("login:other", 2, 1000, 10002)).toBe(true);
      expect(await store.takeAttempt("login:test", 2, 1000, 11000)).toBe(true);
      await store.clearAttempts("login:test");
      expect(await store.takeAttempt("login:test", 2, 1000, 11001)).toBe(true);
  });

  it("handles competing registrations and shared rate limits without instance-local state", async () => {
    const instances = [database.store, new AuthStore(database.query)];
    const results = await Promise.all(instances.map((store) => store.register("same-id", "Learner", "test-hash", newSession())));
    expect(results.filter(Boolean)).toHaveLength(1);
    const accepted = await Promise.all(Array.from({ length: 15 }, (_, index) =>
      instances[index % 2].takeAttempt("shared-limit", 10, 1000, 20000)));
    expect(accepted.filter(Boolean)).toHaveLength(10);
  });

  it("rolls back registration and rotation if session insertion fails", async () => {
    const existing = newSession();
    const account = await database.store.register("atomic-first", "First", "test-hash", existing);
    await expect(database.store.register("atomic-second", "Second", "test-hash", existing)).rejects.toThrow();
    expect(await database.store.credentials("atomic-second")).toBeNull();
    await expect(database.store.createSession(randomUUID(), newSession(), existing.token)).rejects.toThrow();
    expect(await database.store.accountForSession(existing.token)).toEqual(account);
  });

  it("rotates the previous session only if account creation succeeds", async () => {
    const existing = newSession();
    const first = await database.store.register("switch-first", "First", "test-hash", existing);
    expect(await database.store.register("switch-first", "Duplicate", "test-hash", newSession(), existing.token)).toBeNull();
    expect(await database.store.accountForSession(existing.token)).toEqual(first);
    const next = newSession();
    const second = await database.store.register("switch-second", "Second", "test-hash", next, existing.token);
    expect(await database.store.accountForSession(existing.token)).toBeNull();
    expect(await database.store.accountForSession(next.token)).toEqual(second);
  });

  it("can run schema setup again without deleting users", async () => {
    const before = await database.store.credentials("learner");
    for (const statement of AUTH_SCHEMA_STATEMENTS) await database.db.exec(statement);
    expect(await database.store.credentials("learner")).toEqual(before);
  });
});

describe("optional SQLite account import", () => {
  it("preserves original UUIDs and password hashes and refuses a nonempty target", async () => {
    const { db, store } = await testAuthDatabase();
    try {
      const hash = await hashPassword(randomBytes(18).toString("base64url"));
      const account = validateLegacyAccount({
        id: randomUUID(), login_id: "Original", display_name: "Original", password_hash: hash, created_at: Date.now(),
      });
      await db.transaction(async (tx) => {
        await tx.exec("LOCK TABLE spinlearn_auth.accounts IN EXCLUSIVE MODE");
        await tx.exec(EMPTY_IMPORT_TARGET);
        await tx.query(IMPORT_ACCOUNT_SQL, [account.id, account.loginId, account.displayName, account.passwordHash, account.createdAt]);
      });
      expect((await store.credentials("original"))?.account.id).toBe(account.id);
      expect((await store.credentials("original"))?.passwordHash).toBe(hash);
      await expect(db.exec(EMPTY_IMPORT_TARGET)).rejects.toThrow("empty target");
      expect(() => validateLegacyAccount({ password_hash: "plaintext" })).toThrow("unsupported");
    } finally {
      await db.close();
    }
  }, 30000);
});
