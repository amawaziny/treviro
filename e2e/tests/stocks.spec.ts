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

// Test suite
test.describe("Stocks & Equity Funds Page", () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and storage before each test
    await page.context().clearCookies();
    await login(page);
    
    // Navigate to the stocks page
    await page.goto("/investments/stocks");
    // await page.waitForLoadState("networkidle");
  });

  test("should load stocks page with portfolio summary", async ({ page }) => {
    // Verify page title and summary section are visible
    await expect(page.getByTestId("stocks-header")).toBeVisible();
    await expect(page.getByTestId("stocks-title")).toHaveText(/My Stocks & Equity Funds/i);
    await expect(page.getByTestId("stocks-subtitle")).toContainText("Overview of your stock and equity fund investments.");
    
    // Check portfolio summary section
    const portfolioSummary = page.getByTestId("portfolio-summary");
    await expect(portfolioSummary).toBeVisible();
    
    // Check P/L title and amount
    await expect(portfolioSummary.getByTestId("pl-title")).toBeVisible();
    const plAmount = portfolioSummary.getByTestId("total-pl-amount");
    await expect(plAmount).toBeVisible();
    
    // Check trend icon based on P/L
    const plValue = await plAmount.textContent();
    const isProfitable = !plValue?.startsWith("-");
    
    if (isProfitable) {
      await expect(portfolioSummary.getByTestId("trend-up-icon")).toBeVisible();
    } else {
      await expect(portfolioSummary.getByTestId("trend-down-icon")).toBeVisible();
    }
    
    // Check P/L percentage and total invested
    await expect(portfolioSummary.getByTestId("pl-percentage-value")).toBeVisible();
    await expect(portfolioSummary.getByTestId("total-invested-amount")).toBeVisible();
  });

  test("should display list of investments", async ({ page }) => {
    // Check if there are any investment cards
    const investmentCards = page.getByTestId("investment-card");
    const count = await investmentCards.count();
    
    if (count > 0) {
      // If there are investments, the list should be visible
      const investmentsList = page.getByTestId("investments-list");
      await expect(investmentsList).toBeVisible();
      
      // Verify the first investment card is visible
      const firstCard = investmentCards.first();
      await expect(firstCard).toBeVisible();
    } else {
      // If there are no investments, that's a valid state
      test.skip(count === 0, "No investments available to test");
    }
  });

  test("should navigate to security details when clicking on an investment", async ({ page }) => {
    // First check if there are any investment cards
    const investmentCards = page.getByTestId("investment-card");
    const count = await investmentCards.count();
    
    if (count > 0) {
      // Only check for investments list visibility if there are cards
      const investmentsList = page.getByTestId("investments-list");
      await expect(investmentsList).toBeVisible();
      
      // Click the first card
      const firstCard = investmentCards.first();
      await firstCard.click();
      
      // Verify navigation to security details
      await page.waitForURL(/\/securities\/details/);
      await expect(page).toHaveURL(/\/securities\/details/);
    } else {
      test.skip(count === 0, "No investments available to test navigation");
    }
  });

  test("should display loading state while fetching data", async ({ page }) => {
    // Force a reload to see loading state
    // First wait for the add security button to be visible (ensures page is loaded)
    await page.getByTestId("add-security-button").waitFor({ state: 'visible' });
    // Then reload
    await page.reload();
    
    // Verify loading state is shown
    const loadingIndicator = page.locator("[data-testid='loading-skeleton']").first();
    await expect(loadingIndicator).toBeVisible();
    
    // Wait for data to load
    await page.waitForLoadState("networkidle");
    
    // Verify loading state is gone
    await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
  });
});
