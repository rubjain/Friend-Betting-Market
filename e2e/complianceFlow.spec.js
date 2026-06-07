import { test, expect } from "@playwright/test";

test("compliance panel shows identity and location sections when signed in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email or username").fill("test@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");

  await page.goto("/settings#compliance");
  await expect(page.getByRole("heading", { name: "Compliance gates" })).toBeVisible();
  await expect(page.getByText("Identity verification")).toBeVisible();
  await expect(page.getByText("Location verification")).toBeVisible();
});
