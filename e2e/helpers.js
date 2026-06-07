import { expect } from "@playwright/test";

/** Wait for AppShell hydration and a page section title (h3 in SectionHead). */
export async function expectPageTitle(page, title) {
  await expect(page.locator(".section-head h3", { hasText: title })).toBeVisible({
    timeout: 30_000,
  });
}

/** Demo login via login page shortcut + Sign in. */
export async function loginAsTestUser(page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Test User" }).click();
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/?/, { timeout: 15_000 });
  await page.waitForSelector(".hydrate-loading", { state: "hidden", timeout: 30_000 }).catch(() => {});
}
