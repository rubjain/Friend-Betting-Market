import { test, expect } from "@playwright/test";

test("landing loads and markets page shows heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Trade what you know/i })).toBeVisible();
  await page.getByRole("link", { name: "Browse Markets" }).click();
  await expect(page.getByRole("heading", { name: "Markets" })).toBeVisible();
});

test("demo sign-in from login page", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/Email or username/i).fill("test@example.com");
  await page.getByLabel(/^Password$/).fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\//);
  await page.goto("/markets");
  await expect(page.getByRole("heading", { name: "Markets" })).toBeVisible();
});

test("settings page has sync control", async ({ page }) => {
  await page.goto("/settings#account");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Sync latest data/i })).toBeVisible();
});
