import { test, expect } from "@playwright/test";
import { expectPageTitle, loginAsTestUser } from "./helpers.js";

test("demo deposit updates balance in shell", async ({ page }) => {
  test.setTimeout(60_000);

  await loginAsTestUser(page);
  await page.goto("/deposit");
  await expectPageTitle(page, "Add Play Credit");

  await page.getByRole("button", { name: "$25" }).click();
  await page.getByRole("button", { name: /Add with/i }).click();

  await expect(page.locator(".flash-banner[role='status'], .flash-banner").first()).toContainText(/Added|withdrawable/i, {
    timeout: 15_000,
  });
});
