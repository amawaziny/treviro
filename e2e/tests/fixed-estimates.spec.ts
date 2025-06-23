import { test, expect, Page } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Test data
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || "test@treviro.com",
  password: process.env.TEST_USER_PASSWORD || "Test@123",
};

// Helper functions
async function login(page: Page) {
  await page.goto("/");
  await page.waitForSelector('[data-testid="email-input"]');
  await page.fill('[data-testid="email-input"]', TEST_USER.email);
  await page.fill('[data-testid="password-input"]', TEST_USER.password);
  await page.click('[data-testid="sign-in-button"]');
  await page.waitForURL("**/dashboard");
}

test.describe("Fixed Estimates", () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and storage before each test
    await page.context().clearCookies();
    await login(page);
    await page.goto("/fixed-estimates");
  });

  test("should display fixed estimates list", async ({ page }) => {
    // Verify page title and description
    await expect(page.getByTestId("page-title")).toHaveText("Fixed Estimates");
    await expect(page.getByTestId("page-description")).toContainText(
      "Manage your recurring income and expenses",
    );

    // Verify add button is visible
    await expect(page.getByTestId("add-fixed-estimate-button")).toBeVisible();
  });

  test("should navigate to add fixed estimate page", async ({ page }) => {
    // Click add button
    await page.getByTestId("add-fixed-estimate-button").click();

    // Verify navigation to add page
    await expect(page).toHaveURL("/fixed-estimates/add");
    await expect(page.getByTestId("page-title")).toHaveText(
      "Add New Fixed Estimate",
    );
  });

  test.describe("Add Fixed Estimate Form", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/fixed-estimates/add");
    });

    test("should validate required fields", async ({ page }) => {
      // Submit form without filling any fields
      await page.getByTestId("submit-button").click();

      // Verify validation messages
      await expect(page.getByTestId("type-error")).toBeVisible();
      await expect(page.getByTestId("amount-error")).toBeVisible();
      await expect(page.getByTestId("period-error")).toBeVisible();
      await expect(page.getByTestId("isExpense-error")).toBeVisible();
    });

    test("should add a new fixed estimate", async ({ page }) => {
      // Select type
      await page.getByTestId("type-select").click();
      await page.getByTestId("type-option-Salary").click();

      // Fill amount
      await page.getByTestId("amount-input").fill("1000");

      // Select period
      await page.getByTestId("period-select").click();
      await page.getByTestId("period-option-Monthly").click();

      // Submit form
      await page.getByTestId("submit-button").click();

      // Verify success message and redirection
      await expect(page).toHaveURL("/fixed-estimates");
      await expect(page.getByTestId("success-toast")).toBeVisible();

      // Verify the new estimate is in the list
      await expect(
        page.getByTestId("fixed-estimate-item").first(),
      ).toContainText("Salary");
      await expect(
        page.getByTestId("fixed-estimate-item").first(),
      ).toContainText("1,000");
    });
  });

  test.describe("Edit Fixed Estimate", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to edit page of the first estimate
      await page.goto("/fixed-estimates");
      await page.getByTestId("edit-button").first().click();
    });

    test("should update an existing fixed estimate", async ({ page }) => {
      // Update amount
      await page.getByTestId("amount-input").fill("1500");

      // Submit form
      await page.getByTestId("submit-button").click();

      // Verify success message and redirection
      await expect(page).toHaveURL("/fixed-estimates");
      await expect(page.getByTestId("success-toast")).toBeVisible();

      // Verify the updated amount
      await expect(
        page.getByTestId("fixed-estimate-item").first(),
      ).toContainText("1,500");
    });
  });

  test("should delete a fixed estimate", async ({ page }) => {
    // Click delete button on first estimate
    await page.getByTestId("delete-button").first().click();

    // Confirm deletion in dialog
    await page.getByTestId("confirm-delete-button").click();

    // Verify success message
    await expect(page.getByTestId("success-toast")).toBeVisible();
  });
});
