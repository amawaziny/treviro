import { test, expect, Page } from "@playwright/test";
import { faker } from "@faker-js/faker";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Test data
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || "test@treviro.com",
  password: process.env.TEST_USER_PASSWORD || "Test@123",
  newPassword: "newTestPassword123",
};

const TEST_EXPENSE = {
  category: "Credit Card",
  amount: "1000",
  date: new Date().toISOString().split("T")[0],
  description: "Test expense",
  isInstallment: true,
  numberOfInstallments: "3",
};

// Helper functions
async function login(page: Page) {
  await page.goto("/");

  // Wait for the login form to be ready
  await page.waitForSelector('[data-testid="email-input"]');
  await page.waitForSelector('[data-testid="password-input"]');

  // Fill in credentials using test IDs
  await page.fill('[data-testid="email-input"]', TEST_USER.email);
  await page.fill('[data-testid="password-input"]', TEST_USER.password);

  // Click submit using test ID and wait for navigation
  await page.click('[data-testid="sign-in-button"]');

  // Wait for navigation to complete
  await page.waitForURL("/dashboard", { timeout: 30000 });
}

async function logout(page: Page) {
  // Click the user avatar/menu button
  await page.click('button[aria-label="User menu"]');
  // Click the logout button
  await page.click('button:has-text("Logout")');
  await expect(page).toHaveURL("/");
}

// Test suite
test.describe("Regression Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and storage before each test
    await page.context().clearCookies();
  });

  // Login Tests
  test.describe("Authentication", () => {
    test("Valid Login", async ({ page }) => {
      await login(page);
      await expect(page).toHaveURL("/dashboard");
    });

    test("Invalid Login", async ({ page }) => {
      await page.goto("/");

      // Fill in form with invalid credentials using test IDs
      await page.fill('[data-testid="email-input"]', TEST_USER.email);
      await page.fill('[data-testid="password-input"]', "wrongpassword");
      await page.click('[data-testid="sign-in-button"]');

      // Wait for error message to appear
      try {
        await page.waitForSelector('[data-testid="error-message"]', {
          timeout: 5000,
        });
        // Verify error message is visible
        const errorMessage = await page.locator(
          '[data-testid="error-message"]',
        );
        await expect(errorMessage).toBeVisible();
      } catch (error) {
        throw new Error(
          "Invalid login test failed - error message did not appear",
        );
      }

      // Verify we're still on the login page
      await expect(page).not.toHaveURL(/\/dashboard/);
    });

    test("Password Reset Flow", async ({ page }) => {
      // Go to login page
      await page.goto("/");

      // Click forgot password link using test ID
      await page.click('[data-testid="forgot-password-button"]');

      // Verify we're on the forgot password page
      await expect(page.locator("h1")).toContainText("Reset your password");

      // Fill in email using test ID
      await page.fill('[data-testid="forgot-password-email"]', TEST_USER.email);

      // Click send reset link button using test ID
      await page.click('[data-testid="send-reset-link-button"]');

      // Wait for success toast to appear
      await page.waitForSelector('[data-testid="success-toast"]', {
        timeout: 5000,
      });

      // Verify success message is shown
      const successToast = page.locator('[data-testid="success-toast"]');
      await expect(successToast).toBeVisible();
      await expect(successToast).toContainText("Password Reset Email Sent");

      // Verify we're back on the login page
      await expect(page.locator("h1")).toContainText("Welcome back");
    });
  });

  // Global Features Tests
  test.describe("Global Features", () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test("Language Switch", async ({ page }) => {
      // Navigate to dashboard and wait for sidebar to be visible
      await page.goto("/dashboard");
      const sidebar = page.locator('[data-sidebar="sidebar"]');
      await expect(sidebar).toBeVisible();

      // Switch to Arabic
      await page.getByTestId("language-toggle-button").click();
      await page.getByTestId("language-option-ar").click();

      // Verify Arabic text in the sidebar
      const arabicStocks = sidebar
        .getByRole("button", { name: "اﻷسهم" })
        .first();
      await expect(arabicStocks).toBeVisible();

      // Switch back to English
      await page.getByTestId("language-toggle-button").click();
      await page.getByTestId("language-option-en").click();

      // Verify English text in the sidebar
      const englishStocks = sidebar
        .getByRole("button", { name: "Stocks" })
        .first();
      await expect(englishStocks).toBeVisible();
    });

    test("Mobile Responsiveness", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/dashboard");
      await expect(page.locator('button:has-text("Menu")')).toBeVisible();
    });
  });
});
