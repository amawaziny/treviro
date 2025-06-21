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
test.describe("Dashboard Page", () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and storage before each test
    await page.context().clearCookies();
    await login(page);
  });

  test("should load dashboard with all components", async ({ page }) => {
    // Verify dashboard page is loaded
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.getByTestId("dashboard-page")).toBeVisible();

    // Check if all summary cards are visible
    await expect(page.getByTestId("total-invested-card")).toBeVisible();
    await expect(page.getByTestId("total-realized-pl-card")).toBeVisible();
    await expect(page.getByTestId("current-portfolio-pl-card")).toBeVisible();
    await expect(page.getByTestId("total-cash-balance-card")).toBeVisible();

    // Check if monthly cash flow section is visible
    await expect(page.getByTestId("monthly-cash-flow-section")).toBeVisible();
    await expect(page.getByTestId("current-income-card")).toBeVisible();
    await expect(page.getByTestId("total-income-card")).toBeVisible();
    await expect(page.getByTestId("total-expenses-card")).toBeVisible();
    await expect(page.getByTestId("total-investments-card")).toBeVisible();
    await expect(page.getByTestId("remaining-cash-card")).toBeVisible();

    // Check if charts are visible
    await expect(page.getByTestId("investment-distribution-chart")).toBeVisible();
    await expect(page.getByTestId("monthly-investment-distribution-chart")).toBeVisible();
    await expect(page.getByTestId("investment-breakdown-section")).toBeVisible();
  });

  test("should display numeric values in summary cards", async ({ page }) => {
    // Wait for the page to load completely
    await page.waitForLoadState("networkidle");

    // Check if summary cards contain valid numeric values
    const totalInvested = await page.getByTestId("total-invested-card").locator("p:not(.text-xs)").first().textContent();
    expect(totalInvested).toMatch(/^[\d,.]+/); // Should start with a number

    const totalRealizedPL = await page.getByTestId("total-realized-pl-card").locator("p:not(.text-xs)").first().textContent();
    expect(totalRealizedPL).toMatch(/^-?[\d,.]+/); // Can be negative

    const currentPortfolioPL = await page.getByTestId("current-portfolio-pl-card").locator("p:not(.text-xs)").first().textContent();
    expect(currentPortfolioPL).toMatch(/^-?[\d,.]+/); // Can be negative

    const cashBalance = await page.getByTestId("total-cash-balance-card").locator("p:not(.text-xs)").first().textContent();
    expect(cashBalance).toMatch(/^[\d,.]+/); // Should start with a number
  });

  test("should display monthly cash flow values", async ({ page }) => {
    // Wait for the page to load completely
    await page.waitForLoadState("networkidle");

    // Check current income card
    const currentIncome = await page.getByTestId("current-income-card").locator("p:not(.text-xs)").first().textContent();
    expect(currentIncome).toMatch(/^[\d,.]+/);

    // Check total income card
    const totalIncome = await page.getByTestId("total-income-card").locator("p:not(.text-xs)").first().textContent();
    expect(totalIncome).toMatch(/^[\d,.]+/);

    // Check total expenses card
    const totalExpenses = await page.getByTestId("total-expenses-card").locator("p:not(.text-xs)").first().textContent();
    expect(totalExpenses).toMatch(/^[\d,.]+/);

    // Check total investments card
    const totalInvestments = await page.getByTestId("total-investments-card").locator("p:not(.text-xs)").last().textContent();
    expect(totalInvestments).toMatch(/^[\d,.]+/);

    // Check remaining cash card
    const remainingCash = await page.getByTestId("remaining-cash-card").locator("p:not(.text-xs)").first().textContent();
    expect(remainingCash).toMatch(/^-?[\d,.]+/); // Can be negative
  });

  test("should recalculate summary when recalculate button is clicked", async ({ page }) => {
    // Wait for the page to load completely
    await page.waitForLoadState("networkidle");

    // Get the initial values
    const initialTotalInvested = await page.getByTestId("total-invested-card").locator("p:not(.text-xs)").first().textContent();
    
    // Click the recalculate button
    await page.getByTestId("recalculate-summary-button").click();
    
    // Wait for the toast notification
    await expect(page.getByText(/summary recalculated/i)).toBeVisible();
    
    // Get the values after recalculation
    const recalculatedTotalInvested = await page.getByTestId("total-invested-card").locator("p:not(.text-xs)").first().textContent();
    
    // The values should be the same (or at least the same format)
    expect(recalculatedTotalInvested).toMatch(/^[\d,.]+/);
    expect(initialTotalInvested).toEqual(recalculatedTotalInvested);
  });

  test("should navigate to cash flow details when view details is clicked", async ({ page }) => {
    // Wait for the page to load completely
    await page.waitForLoadState("networkidle");
    
    // Click the view details button
    await page.getByRole('link', { name: /view full details/i }).click();
    
    // Verify navigation to cash flow page
    await expect(page).toHaveURL(/.*\/cash-flow/);
    await expect(page.getByRole('heading', { name: /cash flow/i })).toBeVisible();
  });

  test("should display charts with data", async ({ page }) => {
    // Wait for the page to load completely
    await page.waitForLoadState("networkidle");
    
    // Check if charts are rendered with data
    const investmentChart = page.getByTestId("investment-distribution-chart");
    await expect(investmentChart).toBeVisible();
    
    // Check if chart canvas is rendered
    const chartCanvas = investmentChart.locator("canvas");
    await expect(chartCanvas).toBeVisible();
    
    // Check if monthly investment chart is rendered
    const monthlyChart = page.getByTestId("monthly-investment-distribution-chart");
    await expect(monthlyChart).toBeVisible();
  });

  test("should display investment breakdown cards with correct data", async ({ page }) => {
    // Wait for the page to load completely
    await page.waitForLoadState("networkidle");
    
    // Check if investment breakdown section is visible
    const breakdownSection = page.getByTestId("investment-breakdown-section");
    await expect(breakdownSection).toBeVisible();
    
    // Get all investment type cards
    const investmentCards = breakdownSection.locator('div[class*="grid"] > div');
    const cardCount = await investmentCards.count();
    
    // Verify we have at least one card
    expect(cardCount).toBeGreaterThan(0);
    
    // Check each card for required elements and valid data
    for (let i = 0; i < cardCount; i++) {
      const card = investmentCards.nth(i);
      
      // Card should be visible
      await expect(card).toBeVisible();
      
      // Check for investment type icon
      await expect(card.locator('svg')).toBeVisible();
      
      // Check for investment type name
      const typeName = await card.locator('span[class*="text-md"][class*="font-bold"]').textContent();
      expect(typeName).toBeTruthy();
      
      // Check for P/L badge
      const plBadge = card.locator('span[class*="bg-green-600"]');
      await expect(plBadge).toBeVisible();
      
      // Check if P/L has a valid format (number with optional + or -)
      const plText = await plBadge.textContent();
      expect(plText).toMatch(/^[+\-]?[\d,.]+/);
      
      // Check for invested amount
      const investedLabel = card.locator('div:has(> div:has-text("Invested"))');
      await expect(investedLabel).toBeVisible();
      const investedAmount = await investedLabel.locator('div:not(.text-xs)').textContent();
      expect(investedAmount).toMatch(/^[\d,.]+/);
      
      // Check for current value
      const currentLabel = card.locator('div:has(> div:has-text("Current"))');
      await expect(currentLabel).toBeVisible();
      const currentValue = await currentLabel.locator('div:not(.text-xs)').textContent();
      expect(currentValue).toMatch(/^[\d,.]+/);
      
      // Check for portfolio percentage
      const portfolioLabel = card.locator('div:has(> div:has-text("of portfolio"))');
      await expect(portfolioLabel).toBeVisible();
      const portfolioPercent = await portfolioLabel.locator('div:not(.text-xs)').textContent();
      expect(portfolioPercent).toMatch(/^[\d.]+%$/);
    }
  });

  test("should display correct investment types based on configuration", async ({ page }) => {
    // Wait for the page to load completely
    await page.waitForLoadState("networkidle");
    
    // Expected investment types from the default configuration
    const expectedTypes = [
      "Real Estate",
      "Stocks",
      "Debt Instruments",
      "Currencies",
      "Gold"
    ];
    
    // Get all investment type names from the page
    const breakdownSection = page.getByTestId("investment-breakdown-section");
    const typeElements = breakdownSection.locator('span[class*="text-md"][class*="font-bold"]');
    const typeCount = await typeElements.count();
    
    // Check if we have at least one type
    expect(typeCount).toBeGreaterThan(0);
    
    // Collect all displayed types
    const displayedTypes = [];
    for (let i = 0; i < typeCount; i++) {
      const typeName = await typeElements.nth(i).textContent();
      if (typeName) {
        displayedTypes.push(typeName);
      }
    }
    
    // Check if all displayed types are in the expected types
    for (const displayedType of displayedTypes) {
      expect(expectedTypes).toContain(displayedType);
    }
  });
});
