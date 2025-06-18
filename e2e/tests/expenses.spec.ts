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

const TEST_EXPENSE = {
  category: "Credit Card",
  description: "Test expense",
  amount: "1000",
  date: "2025-01-15",
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

    // Fill out the form
    await page.getByRole("combobox", { name: /expense category/i }).click();
    await page
      .getByRole("option", { name: TEST_EXPENSE.category, exact: true })
      .click();

    await page.getByLabel(/description/i).fill(TEST_EXPENSE.description);
    await page.getByLabel(/amount/i).fill(TEST_EXPENSE.amount);
    await page.getByLabel(/date/i).fill(TEST_EXPENSE.date);

    // Toggle installment
    await page.getByRole("checkbox", { name: /installment/i }).click();
    await page
      .getByTestId("installments-input")
      .fill(TEST_EXPENSE.numberOfInstallments);

    // Submit the form
    await page.getByTestId("submit-button").click();

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
    await expect(page.getByText("Category is required")).toBeVisible();
    await expect(page.getByText("Amount is required")).toBeVisible();
    await expect(page.getByText("Date is required")).toBeVisible();

    // Fill with invalid data
    await page.getByLabel(/amount/i).fill("0");
    await expect(page.getByText("Amount must be greater than 0")).toBeVisible();

    // Toggle installment but don't provide number of installments
    await page.getByRole("checkbox", { name: /installment/i }).click();
    await page.getByTestId("submit-button").click();
    await expect(
      page.getByText("Number of installments is required"),
    ).toBeVisible();
  });

  test("should edit an existing expense", async ({ page }) => {
    // First, create an expense to edit
    await page.goto("/expenses/add");
    await page.waitForSelector('[data-testid="expense-form"]');

    // Fill out and submit the form
    await page.getByRole("combobox", { name: /expense category/i }).click();
    await page
      .getByRole("option", { name: TEST_EXPENSE.category, exact: true })
      .click();
    await page.getByLabel(/description/i).fill(TEST_EXPENSE.description);
    await page.getByLabel(/amount/i).fill(TEST_EXPENSE.amount);
    await page.getByLabel(/date/i).fill(TEST_EXPENSE.date);
    await page.getByTestId("submit-button").click();

    // Get the ID of the created expense
    await page.waitForURL(/.*\/expenses/);
    const expenseCard = await page
      .locator('[data-testid^="expense-card-"]')
      .first();
    const expenseId = (await expenseCard.getAttribute("data-testid"))?.replace(
      "expense-card-",
      "",
    );

    // Navigate to edit page
    await page.goto(`/expenses/edit/${expenseId}`);
    await page.waitForSelector('[data-testid="edit-expense-page"]');

    // Update the expense
    const updatedDescription = "Updated test expense";
    await page.getByLabel(/description/i).fill(updatedDescription);
    await page.getByRole("button", { name: /update expense/i }).click();

    // Verify update
    await expect(page).toHaveURL(/.*\/expenses/);
    await expect(page.getByTestId("success-toast")).toContainText(
      "expense updated successfully",
    );
    await expect(
      page.locator(`[data-testid="expense-card-${expenseId}"]`),
    ).toContainText(updatedDescription);
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

    // Store the expense description for assertion
    const expenseDescription = await expenseCard
      .locator('[data-testid="expense-description"]')
      .textContent();

    // Click delete button
    await expenseCard.locator('[data-testid^="delete-expense-"]').click();

    // Confirm deletion
    await page.click('button:has-text("Delete")');

    // Verify success message
    await expect(page.getByTestId("success-toast")).toContainText(
      "Expense deleted successfully",
    );

    // Verify expense is removed from the list
    await expect(
      page.locator(`[data-testid="expense-card-${expenseId}"]`),
    ).not.toBeVisible();

    // Verify the deleted expense's description is not in the list
    if (expenseDescription) {
      await expect(page.getByText(expenseDescription)).not.toBeVisible();
    }
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
      await page.waitForLoadState("networkidle");
    }

    // Verify empty state
    await expect(page.getByTestId("no-expenses-message")).toBeVisible();

    // Test add expense from empty state
    await page.click('[data-testid="add-expense-empty-button"]');
    await expect(page).toHaveURL(/.*\/expenses\/add/);
  });
});
