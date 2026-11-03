import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, workers: 1, retries: 0, timeout: 120000, maxFailures: 1,
  expect: { timeout: 10000 }, reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://localhost:3100", ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", trace: "off", channel: process.env.PLAYWRIGHT_CHANNEL },
  webServer: { command: "npm.cmd run start -- --port 3100", url: "http://localhost:3100", reuseExistingServer: !process.env.CI, timeout: 120000 },
});
