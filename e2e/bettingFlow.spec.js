import { test, expect } from "@playwright/test";
import { expectPageTitle, loginAsTestUser } from "./helpers.js";

test("paper bet: markets to review to confirm to portfolio", async ({ page }) => {
  test.setTimeout(60_000);

  await loginAsTestUser(page);

  const paperMode = page.getByRole("button", { name: "Paper" });
  if (await paperMode.isVisible()) {
    await paperMode.click();
  }

  await page.goto("/markets");
  await expectPageTitle(page, "Markets");

  const marketHref = await page.getByRole("link", { name: /View market:/i }).first().getAttribute("href");
  expect(marketHref).toMatch(/\/markets\//);
  await page.goto(marketHref);
  await expect(page).toHaveURL(/\/markets\/[^/]+/);

  const yesButton = page.getByRole("button", { name: /^YES\b/i }).first();
  if (await yesButton.isVisible()) {
    await yesButton.click();
  }

  const reviewBtn = page.getByRole("button", { name: /Review (paper )?trade/i });
  await expect(reviewBtn).toBeVisible({ timeout: 15_000 });
  await reviewBtn.click();

  const confirmBtn = page.getByRole("button", { name: /Confirm (paper trade|—)/i });
  await expect(confirmBtn).toBeVisible({ timeout: 15_000 });
  await confirmBtn.click();

  await expect(page.locator(".flash-banner").first()).toContainText(/Paper trade|placed|bet/i, {
    timeout: 15_000,
  });

  await page.goto("/portfolio");
  await expectPageTitle(page, "Portfolio");
  await page.getByRole("button", { name: /Paper trading/i }).click();
});
