import { expect, test } from "./fixtures";
import { createLearningBackup } from "../lib/learning-backup";
import { initialLearningState, initialLessonProgress } from "../lib/learning";
import { accountStorageKey } from "../lib/account-storage";

test("deployment backup import confirms replacement, preserves account boundaries, and exports valid data", async ({ page, account }) => {
  await page.goto("/settings");
  await expect(page.getByRole("button", { name: "Download learning backup", exact: true })).toBeEnabled();
  const imported = initialLearningState();
  imported.profile.displayName = "Imported learner";
  imported.bookmarks = ["lora", "kv-cache"];
  imported.progress["lora"] = { ...initialLessonProgress(), step: 2, completedSteps: [0, 1] };
  const backup = createLearningBackup(account.id, imported);
  const input = page.getByLabel("Choose learning backup", { exact: true });
  const upload = { name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) };
  await input.setInputFiles(upload);
  await expect(page.getByRole("dialog", { name: "Restore this learning backup?" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue("Alex Kim");
  await input.setInputFiles(upload);
  await page.getByRole("button", { name: "Restore backup", exact: true }).click();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue("Imported learner");
  await page.reload();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue("Imported learner");
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), accountStorageKey(account.id));
  expect(stored).toEqual(imported);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download learning backup", exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe(`spinlearn-backup-${account.id}.json`);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  expect(JSON.parse(Buffer.concat(chunks).toString()).state).toEqual(imported);
  await download.delete();
  await input.setInputFiles({
    ...upload, buffer: Buffer.from(JSON.stringify({ ...backup, accountId: "00000000-0000-4000-8000-000000000000" })),
  });
  await expect(page.getByRole("alert").filter({ hasText: "different account" })).toBeVisible();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue("Imported learner");
});
