import { test, expect } from "@playwright/test";

test("forgot password page accepts email and shows confirmation", async ({ page }) => {
  await page.goto("/forgot-password");
  await expect(page.getByRole("heading", { name: "Forgot password?" })).toBeVisible();

  await page.getByLabel("Email address").fill("test@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await expect(page.getByText("test@example.com")).toBeVisible();
});
