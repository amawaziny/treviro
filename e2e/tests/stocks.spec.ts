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
    await expect(page.getByTestId("stocks-title")).toHaveText(
      /My Stocks & Equity Funds/i,
    );
    await expect(page.getByTestId("stocks-subtitle")).toContainText(
      "Overview of your stock and equity fund investments.",
    );

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
      await expect(
        portfolioSummary.getByTestId("trend-down-icon"),
      ).toBeVisible();
    }

    // Check P/L percentage and total invested
    await expect(
      portfolioSummary.getByTestId("pl-percentage-value"),
    ).toBeVisible();
    await expect(
      portfolioSummary.getByTestId("total-invested-amount"),
    ).toBeVisible();
  });

  test("should display list of investments", async ({ page }) => {
    // Wait for investment cards to be visible
    const investmentCards = page.locator('[data-testid^="investment-card-"]');
    await expect(investmentCards.first()).toBeVisible({ timeout: 10000 });

    // Count the investment cards
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

  test("should navigate to security details when clicking on an investment", async ({
    page,
  }) => {
    // Wait for investment cards to be visible
    const investmentCards = page.locator('[data-testid^="investment-card-"]');
    await expect(investmentCards.first()).toBeVisible({ timeout: 10000 });

    // Count the investment cards
    const count = await investmentCards.count();

    if (count > 0) {
      // Only check for investments list visibility if there are cards
      const investmentsList = page.getByTestId("investments-list");
      await expect(investmentsList).toBeVisible();

      // Click the first card
      const firstCard = investmentCards.first();
      await firstCard.click();

      // Verify navigation to security details
      await page.waitForURL(/\/securities/);
      await expect(page).toHaveURL(/\/securities/);
    } else {
      test.skip(count === 0, "No investments available to test navigation");
    }
  });

  test("should display loading state while fetching data", async ({ page }) => {
    // Force a reload to see loading state
    // First wait for the add security button to be visible (ensures page is loaded)
    await page.getByTestId("add-security-button").waitFor({ state: "visible" });
    // Then reload
    await page.reload();

    // Verify loading state is shown
    const loadingIndicator = page
      .locator("[data-testid='loading-skeleton']")
      .first();
    await expect(loadingIndicator).toBeVisible();

    // Wait for data to load
    // await page.waitForLoadState("networkidle");

    // Verify loading state is gone
    await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
  });

  test("should allow purchasing a stock and display it in the portfolio", async ({
    page,
  }) => {
    // Navigate to the explore page
    await page.getByTestId("add-security-button").click();
    await page.waitForURL("**/securities");

    // Get initial P/L from dashboard
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const initialDashboardPL = await getNumericValue(
      page,
      '[data-testid="total-current-portfolio-pl-amount"]',
    );

    // Get initial P/L from stocks page
    await page.goto("/investments/stocks");
    await page.waitForLoadState("networkidle");
    const initialStocksPL = await getNumericValue(
      page,
      '[data-testid="total-pl-amount"]',
    );

    // Navigate to the stock details page
    await page.goto("/securities/EGX-ETEL");
    await page.waitForLoadState("networkidle");

    // Get the stock name for later verification
    const stockName = await page.getByTestId("security-name").textContent();

    // Click the buy button
    await page.getByTestId("buy-button").click();

    // Fill in the purchase form using test IDs from the form component
    await page.getByTestId("shares-input").fill("1");
    await page.getByTestId("purchase-price-input").fill("100");
    await page.getByTestId("fees-input").fill("0");

    // Submit the form
    await page.getByTestId("submit-investment-button").click();

    // Wait for the success message (using the toast test ID from the form)
    await expect(page.getByTestId("investment-added-toast")).toBeVisible();

    // Get updated P/L from dashboard
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const updatedDashboardPL = await getNumericValue(
      page,
      '[data-testid="total-current-portfolio-pl-amount"]',
    );

    // Navigate to stocks page and verify updates
    await page.goto("/investments/stocks");
    // await page.waitForLoadState("networkidle");

    // Verify the stock appears in the portfolio
    const investmentCards = page.locator('[data-testid^="investment-card-"]');
    await expect(investmentCards.first()).toBeVisible({ timeout: 10000 });
    await expect(investmentCards).toHaveCount(1);

    // Verify the stock name matches what we purchased
    const purchasedStockName = await page
      .getByTestId("investment-name")
      .first()
      .textContent();
    expect(purchasedStockName).toContain(stockName?.trim());

    // Verify portfolio summary is updated
    const portfolioSummary = page.getByTestId("portfolio-summary");
    await expect(portfolioSummary).toBeVisible();

    // Get updated P/L from stocks page
    const updatedStocksPL = await getNumericValue(
      page,
      '[data-testid="total-pl-amount"]',
    );

    // Verify P/L percentage is displayed
    const plPercentage = portfolioSummary.getByTestId("pl-percentage-value");
    await expect(plPercentage).toBeVisible();

    // Verify total invested amount is displayed
    const totalInvested = portfolioSummary.getByTestId("total-invested-amount");
    await expect(totalInvested).toBeVisible();

    // Verify the total invested amount reflects the new purchase (100 EGP * 1 share + 0 fees)
    const investedText = await totalInvested.textContent();
    const investedAmount = parseFloat(
      investedText?.replace(/[^0-9.-]/g, "") || "0",
    );
    expect(investedAmount).toBeGreaterThanOrEqual(100);

    // Calculate the differences
    const dashboardPLDiff = updatedDashboardPL - initialDashboardPL;
    const stocksPLDiff = updatedStocksPL - initialStocksPL;

    // The difference in P/L between dashboard and stocks page should be the same
    // We use toBeCloseTo to handle potential floating point precision issues
    expect(dashboardPLDiff).toBeCloseTo(stocksPLDiff, 2);

    // Helper function to extract numeric value from element text
    async function getNumericValue(
      page: any,
      selector: string,
    ): Promise<number> {
      const element = await page.locator(selector);
      await expect(element).toBeVisible();
      const text = await element.textContent();
      return parseFloat(text?.replace(/[^0-9.-]/g, "") || "0");
    }

    // Note: Delete functionality is not implemented yet
    // The test will leave the investment in the database for now
  });
});
