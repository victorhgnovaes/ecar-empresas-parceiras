import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/pages",
  workers: 1,
  timeout: 120000,
  use: {
    ...devices["Desktop Chrome"],
    channel: process.env.PLAYWRIGHT_CHANNEL,
    baseURL: process.env.ECAR_PUBLIC_URL ?? "http://127.0.0.1:3200/ecar-empresas-parceiras/",
    reducedMotion: "reduce",
  },
  webServer: process.env.ECAR_PUBLIC_URL ? undefined : {
    command: "node scripts/serve-export.mjs",
    url: "http://127.0.0.1:3200/ecar-empresas-parceiras/",
    timeout: 30000,
  },
});
