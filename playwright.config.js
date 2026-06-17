import { defineConfig, devices } from "@playwright/test";
import os from "node:os";
import path from "node:path";

/**
 * E2E tests expect a running app. Start the dev server first:
 *   npm run dev
 * Then (default base URL http://127.0.0.1:3000):
 *   npm run test:e2e
 *
 * Demo mode (default): no database, dev admin shortcuts enabled.
 * Database mode: set E2E_USE_DATABASE=1 and ensure DATABASE_URL is configured.
 */
const testPort = process.env.PLAYWRIGHT_TEST_PORT || "3100";
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || `http://127.0.0.1:${testPort}`;
const useDatabase = process.env.E2E_USE_DATABASE === "1";
const outputDir =
  process.env.PLAYWRIGHT_OUTPUT_DIR || path.join(os.tmpdir(), "agora-playwright-results");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === "1";

const demoWebServerEnv = {
  ...process.env,
  AGORA_FORCE_DEMO_MODE: "1",
  AGORA_DEV_ADMIN_SHORTCUT: "1",
  AGORA_ESPN_SYNC_INLINE: "0",
  DATABASE_URL: "",
  DIRECT_URL: "",
};

const dbWebServerEnv = {
  ...process.env,
  AGORA_FORCE_DEMO_MODE: "0",
  AGORA_DEV_ADMIN_SHORTCUT: "0",
  AGORA_ESPN_SYNC_INLINE: "0",
  AGORA_PUBLIC_BETA: "1",
};

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  webServer: process.env.PLAYWRIGHT_TEST_BASE_URL
    ? undefined
    : {
        command: `${npmCommand} run dev -- -p ${testPort}`,
        url: baseURL,
        reuseExistingServer,
        timeout: 120_000,
        env: useDatabase ? dbWebServerEnv : demoWebServerEnv,
      },
  outputDir,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  timeout: 60_000,
  projects: [
    {
      name: "demo",
      testIgnore: useDatabase ? ["**/*"] : ["**/dbAuthFlow.spec.js"],
      use: { ...devices["Desktop Chrome"] },
    },
    ...(useDatabase
      ? [
          {
            name: "database",
            testMatch: ["**/dbAuthFlow.spec.js", "**/complianceFlow.spec.js"],
            use: { ...devices["Desktop Chrome"] },
          },
        ]
      : []),
  ],
});
