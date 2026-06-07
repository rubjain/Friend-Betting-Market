import { test, expect } from "@playwright/test";

test.skip(!process.env.DATABASE_URL, "Requires DATABASE_URL for database-backed auth e2e");

test("login page loads and accepts credentials form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.getByLabel("Email or username").fill("test@example.com");
  await page.getByLabel("Password").fill("password123");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
});
