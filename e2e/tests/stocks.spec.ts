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
    // await page.waitForLoadState("networkidle");
    
    // Verify loading state is gone
    await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
  });

  test("should allow purchasing a stock and display it in the portfolio", async ({ page }) => {
    // Navigate to the explore page
    await page.getByTestId("add-security-button").click();
    await page.waitForURL("**/securities");
    
    // Click on the Stocks tab
    await page.getByTestId("stocks-tab").click();
    
    // Wait for stocks to load and click on the first stock
    const firstStock = page.getByTestId("security-card").first();
    await expect(firstStock).toBeVisible();
    const stockName = await firstStock.getByTestId("security-name").textContent();
    
    // Navigate to stock details
    await firstStock.click();
    await page.waitForURL("**/securities/details/**");
    
    // Click on Buy button
    const buyButton = page.getByTestId("buy-security-button");
    await expect(buyButton).toBeVisible();
    await buyButton.click();
    
    // Wait for the add investment form to load
    await page.waitForURL((url) => url.pathname.includes('/investments/add'));
    
    // Fill out the investment form
    await page.getByTestId("purchase-price-input").fill("100");
    await page.getByTestId("shares-input").fill("1");
    await page.getByTestId("purchase-date-input").fill(new Date().toISOString().split('T')[0]);
    await page.getByTestId("fees-input").fill("0");
    
    // Submit the form
    await page.getByTestId("submit-investment-button").click();
    
    // Manually navigate to the stocks page
    await page.goto("/investments/stocks");
    // await page.waitForLoadState("networkidle");
    
    // Verify the stock appears in the portfolio
    const investmentCards = page.getByTestId("investment-card");
    await expect(investmentCards).toHaveCount(1);
    
    // Verify the stock name matches what we purchased
    const purchasedStockName = await page.getByTestId("investment-name").first().textContent();
    expect(purchasedStockName).toContain(stockName?.trim());
    
    // Note: Delete functionality is not implemented yet
    // The test will leave the investment in the database for now
  });
});
