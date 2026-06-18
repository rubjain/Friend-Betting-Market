import { test, expect } from "@playwright/test";

test("signup form shows password mismatch inline", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();

  await page.getByLabel("Email").fill("new-user@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByLabel("Confirm password").fill("different");

  await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Create account" })).toBeDisabled();
});

test("signup form requires terms before submit is enabled", async ({ page }) => {
  await page.goto("/signup");

  await page.getByLabel("Email").fill("new-user@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByLabel("Confirm password").fill("password123");

  const submit = page.getByRole("button", { name: "Create account" });
  await expect(submit).toBeDisabled();

  await page.getByRole("checkbox").check();
  await expect(submit).toBeEnabled();
});
