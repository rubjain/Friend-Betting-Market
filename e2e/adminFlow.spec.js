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

  const dismissFlash = page.getByRole("button", { name: "Dismiss" });
  if (await dismissFlash.isVisible()) {
    await dismissFlash.click();
  }

  const approveBtn = page.getByRole("button", { name: "Approve" }).first();
  if (await approveBtn.isVisible()) {
    const [response] = await Promise.all([
      page.waitForResponse((res) =>
        res.url().includes("/api/admin/markets/") &&
        res.url().includes("/approve") &&
        res.request().method() === "POST",
      ),
      approveBtn.click(),
    ]);
    expect(response.ok()).toBeTruthy();
  }
});
