import { defineConfig } from "@playwright/test";

/**
 * Browser tests: they open the real built site in Chromium and check what a visitor would. Run `npm run build` first,
 * then `npm run e2e`. The server starts with E2E=1, which switches on the made-up sample pages the tests open.
 * PLAYWRIGHT_CHROMIUM_PATH points at an installed browser when the one Playwright downloads isn't available.
 */
const port = 3100;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "off",
    launchOptions: executablePath ? { executablePath, args: ["--no-sandbox"] } : { args: ["--no-sandbox"] },
  },
  webServer: {
    command: `E2E=1 npx next start -p ${port}`,
    url: `http://localhost:${port}/e2e-site`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
