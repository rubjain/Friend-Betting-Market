import { test, expect } from "@playwright/test";
import { expectPageTitle, loginAsTestUser } from "./helpers.js";

test("portfolio tabs and transaction history toggle", async ({ page }) => {
  await loginAsTestUser(page);

  await page.goto("/portfolio");
  await expectPageTitle(page, "Portfolio");

  await page.getByRole("button", { name: /Real trading/i }).click();
  await page.getByRole("button", { name: /Paper trading/i }).click();

  const txToggle = page.getByRole("button", { name: /Show transaction history/i });
  if (await txToggle.isVisible()) {
    await txToggle.click();
    await expect(page.locator(".ledger-filters, .portfolio-ledger").first()).toBeVisible();
  }
});
