import { test, expect, Page } from '@playwright/test';
import { faker } from '@faker-js/faker';

// Test data
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testPassword123',
  newPassword: 'newTestPassword123',
};

const TEST_EXPENSE = {
  category: 'Credit Card',
  amount: '1000',
  date: new Date().toISOString().split('T')[0],
  description: 'Test expense',
  isInstallment: true,
  numberOfInstallments: '3',
};

// Helper functions
async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
}

async function logout(page: Page) {
  await page.click('[data-testid="profile-menu"]');
  await page.click('[data-testid="logout-button"]');
  await expect(page).toHaveURL('/login');
}

// Test suite
test.describe('Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and storage before each test
    await page.context().clearCookies();
  });

  // Login Tests
  test.describe('Authentication', () => {
    test('Valid Login', async ({ page }) => {
      await login(page);
      await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible();
    });

    test('Invalid Login', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'invalid@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });

    test('Password Reset', async ({ page }) => {
      await page.goto('/login');
      await page.click('[data-testid="forgot-password"]');
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.click('button[type="submit"]');
      await expect(page.locator('[data-testid="reset-success"]')).toBeVisible();
    });
  });

  // Profile Tests
  test.describe('Profile Management', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.goto('/profile');
    });

    test('View Profile', async ({ page }) => {
      await expect(page.locator('[data-testid="profile-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="profile-picture"]')).toBeVisible();
    });

    test('Update Profile', async ({ page }) => {
      const newName = faker.person.fullName();
      await page.fill('[data-testid="profile-name-input"]', newName);
      await page.click('[data-testid="save-profile"]');
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="profile-name"]')).toContainText(newName);
    });

    test('Change Password', async ({ page }) => {
      await page.fill('[data-testid="current-password"]', TEST_USER.password);
      await page.fill('[data-testid="new-password"]', TEST_USER.newPassword);
      await page.fill('[data-testid="confirm-password"]', TEST_USER.newPassword);
      await page.click('[data-testid="change-password"]');
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Verify new password works
      await logout(page);
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.newPassword);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/dashboard');
    });
  });

  // Expenses Tests
  test.describe('Expense Management', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.goto('/expenses');
    });

    test('Add New Expense', async ({ page }) => {
      await page.click('[data-testid="add-expense"]');
      await page.selectOption('[data-testid="expense-category"]', TEST_EXPENSE.category);
      await page.fill('[data-testid="expense-amount"]', TEST_EXPENSE.amount);
      await page.fill('[data-testid="expense-date"]', TEST_EXPENSE.date);
      await page.fill('[data-testid="expense-description"]', TEST_EXPENSE.description);
      await page.click('[data-testid="save-expense"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator(`text=${TEST_EXPENSE.description}`)).toBeVisible();
    });

    test('Add Installment Expense', async ({ page }) => {
      await page.click('[data-testid="add-expense"]');
      await page.selectOption('[data-testid="expense-category"]', 'Credit Card');
      await page.check('[data-testid="is-installment"]');
      await page.fill('[data-testid="expense-amount"]', TEST_EXPENSE.amount);
      await page.fill('[data-testid="number-of-installments"]', TEST_EXPENSE.numberOfInstallments);
      await page.click('[data-testid="save-expense"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="installment-plan"]')).toBeVisible();
    });

    test('Edit Expense', async ({ page }) => {
      const newAmount = '2000';
      await page.click(`[data-testid="edit-expense-${TEST_EXPENSE.description}"]`);
      await page.fill('[data-testid="expense-amount"]', newAmount);
      await page.click('[data-testid="save-expense"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator(`text=${newAmount}`)).toBeVisible();
    });

    test('Delete Expense', async ({ page }) => {
      await page.click(`[data-testid="delete-expense-${TEST_EXPENSE.description}"]`);
      await page.click('[data-testid="confirm-delete"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator(`text=${TEST_EXPENSE.description}`)).not.toBeVisible();
    });

    test('Filter Expenses', async ({ page }) => {
      await page.click('[data-testid="show-all-toggle"]');
      await page.click('[data-testid="show-ended-toggle"]');
      
      // Verify filters are applied
      const expenses = await page.locator('[data-testid="expense-item"]').all();
      for (const expense of expenses) {
        const isVisible = await expense.isVisible();
        expect(isVisible).toBeTruthy();
      }
    });
  });

  // Dashboard Tests
  test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.goto('/dashboard');
    });

    test('View Total Investment', async ({ page }) => {
      const totalInvestment = await page.locator('[data-testid="total-investment"]').textContent();
      expect(totalInvestment).toMatch(/^\d+(\.\d{2})?$/);
    });

    test('View Portfolio Allocation', async ({ page }) => {
      await expect(page.locator('[data-testid="portfolio-chart"]')).toBeVisible();
      const chartItems = await page.locator('[data-testid="portfolio-item"]').all();
      expect(chartItems.length).toBeGreaterThan(0);
    });

    test('View Asset Types', async ({ page }) => {
      await expect(page.locator('[data-testid="asset-types-chart"]')).toBeVisible();
      const chartItems = await page.locator('[data-testid="asset-type-item"]').all();
      expect(chartItems.length).toBeGreaterThan(0);
    });

    test('View Monthly Cash Flow', async ({ page }) => {
      await expect(page.locator('[data-testid="cash-flow-card"]')).toBeVisible();
      const income = await page.locator('[data-testid="monthly-income"]').textContent();
      const expenses = await page.locator('[data-testid="monthly-expenses"]').textContent();
      expect(income).toMatch(/^\d+(\.\d{2})?$/);
      expect(expenses).toMatch(/^\d+(\.\d{2})?$/);
    });
  });

  // Global Features Tests
  test.describe('Global Features', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Change Language', async ({ page }) => {
      await page.click('[data-testid="language-selector"]');
      await page.click('[data-testid="language-ar"]');
      
      // Verify RTL layout
      const body = await page.locator('body');
      await expect(body).toHaveAttribute('dir', 'rtl');
      
      // Verify date format
      const date = await page.locator('[data-testid="date-format"]').textContent();
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('Mobile Responsiveness', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
      await expect(page.locator('[data-testid="bottom-tab-bar"]')).toBeVisible();
      
      // Test orientation change
      await page.setViewportSize({ width: 667, height: 375 });
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    });
  });
}); 