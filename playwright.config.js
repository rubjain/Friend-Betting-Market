import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests expect a running app. Start the dev server first:
 *   npm run dev
 * Then (default base URL http://127.0.0.1:3000):
 *   npm run test:e2e
 * If you use another origin:
 *   PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:3001 npm run test:e2e
 *
 * Next.js allows only one `next dev` per project directory; do not start a second dev server for Playwright.
 */
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
