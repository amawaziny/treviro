import { test, expect, Page } from "@playwright/test";
import { format } from "date-fns";
import * as dotenv from "dotenv";
import * as path from "path";


// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Test data
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || "test@treviro.com",
  password: process.env.TEST_USER_PASSWORD || "Test@123",
};

const TEST_EXPENSE = {
  category: "Credit Card",
  description: "Test expense",
  amount: "1000",
  date: format(new Date(), "dd-MM-yyyy"),
  isInstallment: true,
  numberOfInstallments: "3",
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
test.describe("Expenses Management", () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and storage before each test
    await page.context().clearCookies();
    await login(page);
  });

  test("should navigate to add expense page", async ({ page }) => {
    // Navigate to expenses page
    await page.goto("/expenses");
    await page.waitForSelector('[data-testid="expenses-page"]');

    // Click add expense button
    await page.click('[data-testid="add-expense-button"]');

    // Verify navigation to add expense page
    await expect(page).toHaveURL(/.*\/expenses\/add/);
    await expect(page.getByTestId("add-expense-page")).toBeVisible();
    await expect(page.getByTestId("expense-form")).toBeVisible();
  });

  test("should add a new expense", async ({ page }) => {
    // Navigate to add expense page
    await page.goto("/expenses/add");
    await page.waitForSelector('[data-testid="expense-form"]');

    // Fill out the form using test IDs
    await page.getByTestId("category-select").click();
    await page
      .getByRole("option", { name: TEST_EXPENSE.category, exact: true })
      .click();

    await page.getByTestId("description-input").fill(TEST_EXPENSE.description);
    await page.getByTestId("amount-input").fill(TEST_EXPENSE.amount);
    await page.getByTestId("date-input").fill(TEST_EXPENSE.date);

    // Toggle installment
    await page.getByTestId("installment-checkbox").click();
    await page
      .getByTestId("installments-input")
      .fill(TEST_EXPENSE.numberOfInstallments);

    // Submit the form
    await page.getByTestId("submit-button").click();
    await page.waitForSelector('[data-testid="success-toast"]', {
      state: "attached",
    });

    // Verify success toast
    await expect(page.getByTestId("success-toast")).toBeVisible();
  });

  test("should show validation errors", async ({ page }) => {
    // Navigate to add expense page
    await page.goto("/expenses/add");
    await page.waitForSelector('[data-testid="expense-form"]');

    // Submit empty form
    await page.getByTestId("submit-button").click();

    // Verify validation errors
    await expect(page.getByText("Must be a valid number")).toBeVisible();

    // Fill with invalid data
    await page.getByTestId("amount-input").fill("0");
    await page.getByTestId("submit-button").click();
    await expect(page.getByText("Amount must be greater than 0")).toBeVisible();

    // Toggle installment but don't provide number of installments
    await page.getByTestId("category-select").click();
    await page
      .getByRole("option", { name: "Credit Card", exact: true })
      .click();
    await page.getByTestId("installment-checkbox").click();
    await page.getByTestId("submit-button").click();
    await expect(
      page.getByText("Number of months is required for installment plans"),
    ).toBeVisible();
  });

  test("should edit an existing expense", async ({ page }) => {
    // First, create an expense to edit
    await page.goto("/expenses/add");
    await page.waitForSelector('[data-testid="expense-form"]');

    // Fill out and submit the form
    await page.getByTestId("category-select").click();
    await page
      .getByRole("option", { name: TEST_EXPENSE.category, exact: true })
      .click();
    await page.getByTestId("description-input").fill(TEST_EXPENSE.description);
    await page.getByTestId("amount-input").fill(TEST_EXPENSE.amount);
    await page.getByTestId("date-input").fill(TEST_EXPENSE.date);

    // Wait for navigation after form submission
    await Promise.all([
      page.waitForURL(/.*\/expenses/),
      page.getByTestId("submit-button").click(),
    ]);

    // Find and click the edit button on the expense card
    const expenseCard = await page
      .locator('[data-testid^="expense-card-"]')
      .first();
    const expenseId = (await expenseCard.getAttribute("data-testid"))?.replace(
      "expense-card-",
      "",
    );

    if (!expenseId) {
      throw new Error("Failed to get expense ID");
    }

    // Click the edit button
    await expenseCard.locator('button[aria-label="Edit"]').click();

    // Wait for the edit page to load
    await page.waitForSelector('[data-testid="edit-expense-page"]');

    // Update the expense
    const updatedDescription = "Updated test expense";
    await page.getByLabel(/description/i).fill(updatedDescription);

    // Submit the form and wait for navigation
    await Promise.all([
      page.waitForURL(/.*\/expenses/),
      page.getByTestId("submit-button").click(),
    ]);

    // Verify update
    await expect(page.getByTestId("success-toast")).toBeVisible();
  });

  test("should filter expenses", async ({ page }) => {
    // Navigate to expenses page
    await page.goto("/expenses");
    await page.waitForSelector('[data-testid="expenses-page"]');

    // Check initial state
    await expect(page.getByTestId("show-all-toggle")).not.toBeChecked();
    await expect(page.getByTestId("show-ended-toggle")).not.toBeChecked();

    // Toggle show all
    await page.click('[data-testid="show-all-toggle"]');
    await expect(page.getByTestId("show-all-toggle")).toBeChecked();

    // Toggle show ended
    await page.click('[data-testid="show-ended-toggle"]');
    await expect(page.getByTestId("show-ended-toggle")).toBeChecked();
  });

  test("should delete an expense", async ({ page }) => {
    // Navigate to expenses page
    await page.goto("/expenses");
    await page.waitForSelector('[data-testid="expenses-page"]');

    // Get the first expense card
    const expenseCard = await page
      .locator('[data-testid^="expense-card-"]')
      .first();
    const expenseId = (await expenseCard.getAttribute("data-testid"))?.replace(
      "expense-card-",
      "",
    );

    // Click delete button
    await expenseCard.locator('[data-testid^="delete-expense-"]').click();

    // Confirm deletion
    await page.click('button:has-text("Delete")');

    // Verify expense is removed from the list
    await expect(
      page.locator(`[data-testid="expense-card-${expenseId}"]`),
    ).not.toBeVisible();
  });

  test("should show empty state when no expenses", async ({ page }) => {
    // Navigate to expenses page
    await page.goto("/expenses");
    await page.waitForSelector('[data-testid="expenses-page"]');

    // Delete all expenses if any
    const deleteButtons = await page
      .locator('[data-testid^="delete-expense-"]')
      .all();
    for (const button of deleteButtons) {
      await button.click();
      await page.click('button:has-text("Delete")');
      // await page.waitForLoadState("networkidle");
    }

    // Verify empty state
    await expect(page.getByTestId("no-expenses-message")).toBeVisible();
  });
});
