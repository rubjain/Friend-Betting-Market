import { test, expect } from "@playwright/test";

test("developer portal: paper strategy create, run, and real-money guard", async ({ page }) => {
  test.setTimeout(60_000);

  await page.goto("/login");
  await page.getByRole("button", { name: "Test User" }).click();
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/?/);

  await page.goto("/developer");
  await expect(page.getByRole("heading", { name: "Developer" })).toBeVisible();
  await expect(page.getByText("Paper only")).toBeVisible();

  const paperName = `e2e-paper-${Date.now()}`;
  await page.locator("#strategy-name").fill(paperName);
  await page.locator("#strategy-status").selectOption("ACTIVE");
  await page.getByRole("button", { name: "Create paper strategy" }).click();

  const paperRow = page.locator(".bet-row", { hasText: paperName });
  await expect(paperRow).toBeVisible();

  await paperRow.getByRole("button", { name: "Run" }).click();
  await expect(page.locator(".flash-banner[role='status']")).toContainText(
    "Strategy run completed",
  );

  const blockedPromote = await page.evaluate(async () => {
    const listRes = await fetch("/api/v1/strategies");
    const list = await listRes.json();
    const strategy = (list.strategies || []).find((item) => String(item.name || "").startsWith("e2e-paper-"));
    if (!strategy?.id) return { skipped: true };
    const res = await fetch(`/api/v1/strategies/${strategy.id}/promote`, { method: "POST" });
    const body = await res.json();
    return { status: res.status, code: body.code };
  });

  if (!blockedPromote.skipped) {
    expect(blockedPromote.status).toBe(403);
    expect(blockedPromote.code).toBe("REAL_MONEY_DISABLED");
  }
});
