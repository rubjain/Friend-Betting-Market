import { test, expect } from "@playwright/test";
import { expectPageTitle, loginAsTestUser } from "./helpers.js";

test("strategy marketplace: browse, publish path, and subscriptions page", async ({ page }) => {
  test.setTimeout(90_000);

  await loginAsTestUser(page);

  await page.goto("/strategies");
  await expectPageTitle(page, "Strategy Marketplace");
  await expect(page.getByText("Follow paper trading strategies")).toBeVisible();
  await expect(page.getByLabel("Search")).toBeVisible();

  await page.getByRole("link", { name: "My subscriptions" }).click();
  await expect(page).toHaveURL(/\/strategies\/subscriptions/);
  await expect(page.getByText("My Strategy Subscriptions")).toBeVisible();

  await page.goto("/strategies/creator");
  await expect(page.getByRole("heading", { name: "Creator Dashboard" })).toBeVisible();
  await expect(page.getByText("Publish paper strategy")).toBeVisible();

  await page.goto("/developer");
  await expect(page.getByRole("link", { name: "Publish to marketplace" })).toBeVisible();
  await expect(page.getByText("Trigger marketplace copying")).toBeVisible();
});
