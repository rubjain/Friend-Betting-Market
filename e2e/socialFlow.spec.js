import { test, expect } from "@playwright/test";
import { expectPageTitle, loginAsTestUser } from "./helpers.js";

test("friends page tabs and bet-together section load", async ({ page }) => {
  await loginAsTestUser(page);

  await page.goto("/friends");
  await expectPageTitle(page, "Friends");

  await page.getByRole("button", { name: "Bet Together" }).click();
  await expect(page.getByText(/invite friends|Bet Together|pick a market/i).first()).toBeVisible();
});
