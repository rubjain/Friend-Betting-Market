import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers.js";

test("admin dashboard loads and shows market review section", async ({ page }) => {
  test.setTimeout(60_000);

  await loginAsTestUser(page);
  const patchRes = await page.request.patch("/api/session", {
    data: { isAdmin: true },
  });
  expect(patchRes.ok()).toBeTruthy();
  await page.reload();

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.locator(".section-head h3", { hasText: "Admin Dashboard" })).toBeVisible({
    timeout: 30_000,
  });

  const approveBtn = page.getByRole("button", { name: "Approve" }).first();
  if (await approveBtn.isVisible()) {
    await approveBtn.click();
    await expect(page.locator(".flash-banner[role='status']")).toContainText(/approv/i, {
      timeout: 15_000,
    });
  }
});
