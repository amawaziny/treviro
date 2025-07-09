import { test, expect, Page } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";
import { addYears, subYears } from "date-fns";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Test data
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || "test@treviro.com",
  password: process.env.TEST_USER_PASSWORD || "Test@123",
};

const nextYearDate = addYears(new Date(), 1);

const TEST_CERTIFICATE = {
  totalCost: "100000",
  issuer: "Ahly Bank TEST",
  purchaseDate: subYears(nextYearDate, 3).getFullYear() + "-01-11", // YYYY-MM-DD format for date input
  expiryDate: nextYearDate.getFullYear() + "-01-12", // YYYY-MM-DD format for date input
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

  test("should create a new debt certificate and validate projection", async ({
    page,
  }) => {
    let certificateId: string | null = null;

    try {
      // Navigate to dashboard to get initial total invested amount
      await page.goto("/dashboard");
      await page.waitForSelector('[data-testid="total-invested-amount"]');
      const initialTotalInvestedText = await page
        .locator('[data-testid="total-invested-amount"]')
        .textContent();
      const initialTotalInvested = parseFloat(
        initialTotalInvestedText?.replace(/[^0-9.-]+/g, "") || "0",
      );

      // Navigate to debts page and get initial projected interest
      await page.goto("/investments/debt-instruments");
      await page.waitForSelector('[data-testid="debts-page"]');

      // Get initial projected interest values
      const initialMonthlyText = await page
        .locator('p:has-text("Projected Interest:")')
        .first()
        .textContent();
      const initialMonthly = parseFloat(
        initialMonthlyText
          ?.match(/EGP\s([\d,]+(?:\.\d+)?)/)?.[1]
          .replace(/,/g, "") || "0",
      );

      const initialYearlyText = await page
        .locator('p:has-text("Projected Interest:")')
        .nth(1)
        .textContent();
      const initialYearly = parseFloat(
        initialYearlyText
          ?.match(/EGP\s([\d,]+(?:\.\d+)?)/)?.[1]
          .replace(/,/g, "") || "0",
      );

      // Click add new debt certificate button
      await page.click('[data-testid="add-debt-certificate-button"]');

      // Fill in the debt certificate form
      await page.fill(
        '[data-testid="total-cost-input"]',
        TEST_CERTIFICATE.totalCost,
      );
      await page.fill('[data-testid="issuer-input"]', TEST_CERTIFICATE.issuer);
      await page.fill(
        '[data-testid="purchase-date-input"]',
        TEST_CERTIFICATE.purchaseDate,
      );
      await page.fill(
        '[data-testid="expiry-date-input"]',
        TEST_CERTIFICATE.expiryDate,
      );
      await page.fill(
        '[data-testid="interest-rate-input"]',
        TEST_CERTIFICATE.interestRate,
      );

      // Save the certificate
      await page.click('[data-testid="save-certificate-button"]');

      // Verify success toast is shown
      await expect(
        page.locator('[data-testid="investment-added-toast"]'),
      ).toBeVisible();

      // Navigate back to debt instruments page
      await page.goto("/investments/debt-instruments");
      await page.waitForSelector('[data-testid="debts-page"]');

      // Find the certificate card by issuer name and get its ID
      const certificateCard = page
        .locator('[data-testid="certificate-card"]')
        .filter({ hasText: TEST_CERTIFICATE.issuer })
        .first();

      await expect(certificateCard).toBeVisible();

      // Extract the certificate ID from the edit button
      const editButton = certificateCard.locator('[data-testid^="edit-debt-"]');
      const editHref = await editButton.getAttribute("href");
      certificateId = editHref?.match(/\/edit\/([^/?]+)/)?.[1] || null;

      // Calculate expected projections (10% of 100,000 = 10,000 per year, ~833.33 per month)
      const expectedYearlyProjection = 10000;
      const expectedMonthlyProjection = expectedYearlyProjection / 12;

      // Get updated projected interest values
      const updatedMonthlyText = await page
        .locator('p:has-text("Projected Interest:")')
        .first()
        .textContent();
      const updatedMonthly = parseFloat(
        updatedMonthlyText
          ?.match(/EGP\s([\d,]+(?:\.\d+)?)/)?.[1]
          .replace(/,/g, "") || "0",
      );

      const updatedYearlyText = await page
        .locator('p:has-text("Projected Interest:")')
        .nth(1)
        .textContent();
      const updatedYearly = parseFloat(
        updatedYearlyText
          ?.match(/EGP\s([\d,]+(?:\.\d+)?)/)?.[1]
          .replace(/,/g, "") || "0",
      );

      // Verify the projections increased by the expected amounts
      expect(updatedMonthly).toBeCloseTo(
        initialMonthly + expectedMonthlyProjection,
        0,
      );
      expect(updatedYearly).toBeCloseTo(
        initialYearly + expectedYearlyProjection,
        0,
      );

      // Navigate back to dashboard and verify total invested amount increased
      await page.goto("/dashboard");
      await page.waitForSelector('[data-testid="total-invested-amount"]');
      const updatedTotalInvestedText = await page
        .locator('[data-testid="total-invested-amount"]')
        .textContent();
      const updatedTotalInvested = parseFloat(
        updatedTotalInvestedText?.replace(/[^0-9.-]+/g, "") || "0",
      );

      // Verify the total invested amount increased by the certificate amount
      expect(updatedTotalInvested).toBeCloseTo(
        initialTotalInvested + parseFloat(TEST_CERTIFICATE.totalCost),
        0,
      );

      // Get current date to check if it's the 12th of the month
      const today = new Date();
      if (today.getDate() === 12) {
        // Verify current income on the 12th of the month
        const currentIncome = await page
          .locator('[data-testid="current-income"]')
          .textContent();
        expect(currentIncome).toContain(expectedMonthlyProjection);
      }
    } finally {
      // Clean up: Delete the created certificate
      if (certificateId) {
        try {
          console.log("Cleaning up test certificate...");

          // Find the certificate card by issuer name
          const certificateCard = page
            .locator('[data-testid="certificate-card"]')
            .filter({ hasText: TEST_CERTIFICATE.issuer })
            .first();

          if (await certificateCard.isVisible()) {
            // Click the delete button using the exact test ID pattern
            const deleteButton = certificateCard.locator(
              `[data-testid^="delete-debt-"]`,
            );
            await deleteButton.click();

            // Wait for and confirm the delete dialog
            const confirmDeleteButton = page.locator(
              '[data-testid="confirm-delete-button"]',
            );
            await confirmDeleteButton.waitFor({ state: "visible" });
            await confirmDeleteButton.click();

            // Wait for the success message
            // await expect(page.locator('[data-testid="debt-deleted-toast"]')).toBeVisible({ timeout: 10000 });
            console.log("Test certificate cleanup completed");
          } else {
            console.log(
              "Certificate not found during cleanup, may have already been deleted",
            );
          }
        } catch (error) {
          console.error("Error during certificate cleanup:", error);
        }
      } else {
        console.log("No certificate ID found, skipping cleanup");
      }
    }
  });
});
