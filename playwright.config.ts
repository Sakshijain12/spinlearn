import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "tests",
  testMatch: "**/*.e2e.ts",
  timeout: 60000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    browserName: "chromium",
    channel: process.platform === "win32" ? "msedge" : undefined,
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
  },
});
