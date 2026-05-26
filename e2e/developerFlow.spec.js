import { test, expect } from "@playwright/test";

test("developer portal: paper -> real workflow", async ({ page }) => {
  test.setTimeout(60_000);

  await page.goto("/login");
  await page.getByRole("button", { name: "Test User" }).click();
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/?/);

  await page.goto("/developer");
  await expect(page.getByRole("heading", { name: "Developer" })).toBeVisible();

  const paperName = `e2e-paper-${Date.now()}`;
  await page.locator("#strategy-name").fill(paperName);
  await page.locator("#strategy-mode").selectOption("PAPER");
  await page.locator("#strategy-status").selectOption("ACTIVE");
  await page.getByRole("button", { name: "Create strategy" }).click();

  const paperRow = page.locator(".bet-row", { hasText: paperName });
  await expect(paperRow).toBeVisible();

  // Run paper strategy
  await paperRow.getByRole("button", { name: "Run" }).click();
  await expect(page.locator(".flash-banner[role='status']")).toContainText(
    "Strategy run completed",
  );

  // Promote paper -> real
  await paperRow.getByRole("button", { name: "Promote to real" }).click();
  await expect(page.locator(".flash-banner[role='status']")).toContainText(
    "Promoted to real strategy draft",
  );

  const realName = `${paperName} (real)`;
  const realRow = page.locator(".bet-row", { hasText: realName });
  await expect(realRow).toBeVisible();

  // Real strategy should be DRAFT; activate then run.
  await realRow.getByRole("button", { name: "Activate" }).click();
  await expect(page.locator(".flash-banner[role='status']")).toContainText("Strategy activated");

  await realRow.getByRole("button", { name: "Run" }).click();
  await expect(page.locator(".flash-banner[role='status']")).toContainText(
    "Strategy run completed",
  );
});

