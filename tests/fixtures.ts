import { randomBytes } from "node:crypto";
import { test as base, expect } from "playwright/test";
import { authResponseSchema, type Account } from "../lib/auth/validation";

export { expect };
export type { Page } from "playwright/test";
export type TestAccount = Account & { password: string };

export const test = base.extend<{ account: TestAccount }>({
  account: [async ({ context, baseURL }, use) => {
    if (!baseURL) throw new Error("The browser test base URL must be configured.");
    const loginId = `test-${randomBytes(12).toString("hex")}`;
    const password = randomBytes(24).toString("base64url");
    const response = await context.request.post(`${baseURL}/api/auth/register`, {
      headers: { Origin: new URL(baseURL).origin },
      data: { loginId, displayName: "Alex Kim", password, confirmPassword: password },
    });
    expect(response.status(), await response.text()).toBe(201);
    const { account } = authResponseSchema.parse(await response.json());
    await use({ ...account, password });
  }, { auto: true }],
  request: async ({ context }, use) => use(context.request),
});
