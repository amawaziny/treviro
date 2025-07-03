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

const TEST_CERTIFICATE = {
  totalCost: "100000",
  issuer: "Ahly Bank",
  purchaseDate: "2023-01-11", // YYYY-MM-DD format for date input
  expiryDate: "2026-01-12", // YYYY-MM-DD format for date input
  interestRate: "10",
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

// Test suite
test.describe("Debt Certificate Management", () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and storage before each test
    await page.context().clearCookies();
    await login(page);
  });

  test("should create a new debt certificate and validate projection", async ({ page }) => {
    // Navigate to debts page
    await page.goto("/investments/debt-instruments");
    await page.waitForSelector('[data-testid="debts-page"]');

    // Click add new debt certificate button
    await page.click('[data-testid="add-debt-certificate-button"]');

    // Fill in the debt certificate form
    await page.fill('[data-testid="total-cost-input"]', TEST_CERTIFICATE.totalCost);
    await page.fill('[data-testid="issuer-input"]', TEST_CERTIFICATE.issuer);
    await page.fill('[data-testid="purchase-date-input"]', TEST_CERTIFICATE.purchaseDate);
    await page.fill('[data-testid="expiry-date-input"]', TEST_CERTIFICATE.expiryDate);
    await page.fill('[data-testid="interest-rate-input"]', TEST_CERTIFICATE.interestRate);
    
    // Save the certificate
    await page.click('[data-testid="save-certificate-button"]');

    // Verify the certificate is saved and visible in the list
    await expect(page.locator(`text=${TEST_CERTIFICATE.issuer}`).first()).toBeVisible();
    
    // Calculate expected projection (10% of 100,000 = 10,000 per year)
    const expectedYearlyProjection = 10000;
    const expectedMonthlyProjection = (expectedYearlyProjection / 12).toFixed(2);

    // Navigate back to debt instruments page to verify summary
    await page.goto("/investments/debt-instruments");
    await page.waitForSelector('[data-testid="debts-page"]');

    // Verify the certificate is in the list
    await expect(page.locator(`text=${TEST_CERTIFICATE.issuer}`).first()).toBeVisible();

    // Verify projection in Debts screen summary
    const monthlyProjectionText = await page.locator('text=Projected Monthly Interest').locator('xpath=following-sibling::div').textContent();
    expect(monthlyProjectionText).toContain(expectedMonthlyProjection);

    // Navigate to Dashboard to verify income projection
    await page.goto("/dashboard");
    await page.waitForSelector('[data-testid="dashboard-page"]');

    // Verify projection in Income section
    const incomeProjection = await page.locator('text=Projected Monthly Income').locator('xpath=following-sibling::div').textContent();
    expect(incomeProjection).toContain(expectedMonthlyProjection);

    // Get current date to check if it's the 12th of the month
    const today = new Date();
    if (today.getDate() === 12) {
      // Verify current income on the 12th of the month
      const currentIncome = await page.locator('[data-testid="current-income"]').textContent();
      expect(currentIncome).toContain(expectedMonthlyProjection);
    }
  });
});
