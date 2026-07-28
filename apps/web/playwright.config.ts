import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a running stack (or `pnpm dev`).
 * Set E2E_BASE_URL to point at the deployed web origin.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8080",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
