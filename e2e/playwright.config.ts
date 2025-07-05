import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: "./e2e/.env" });

export default defineConfig({
  globalSetup: require.resolve("./global-setup"),
  globalTeardown: require.resolve("./global-teardown"),
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: Number(process.env.TEST_RETRIES) || (process.env.CI ? 2 : 0),
  workers: Number(process.env.TEST_WORKERS) || (process.env.CI ? 1 : undefined),
  timeout: Number(process.env.TEST_TIMEOUT) || 30000,
  reporter: "html",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:9002",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    headless: process.env.HEADLESS === "true",
    // slowMo: Number(process.env.SLOW_MO) || 0,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],
});
