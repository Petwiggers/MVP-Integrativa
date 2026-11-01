import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    hasTouch: true,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "tablet-retrato",
      testMatch: "totem.spec.ts",
      use: { ...devices["Desktop Chrome"], viewport: { width: 800, height: 1280 }, hasTouch: true },
    },
    {
      name: "tablet-paisagem",
      testMatch: "totem.spec.ts",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, hasTouch: true },
    },
    {
      // Painel do RH: roda uma vez só (o rate limit do login é real também nos testes).
      name: "painel-rh",
      testMatch: ["admin.spec.ts", "security.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: `${baseURL}/totem/manifest.webmanifest`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
