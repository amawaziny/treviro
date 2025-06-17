import { test, expect, Page } from '@playwright/test';
import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Test data
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@treviro.com',
  password: process.env.TEST_USER_PASSWORD || 'Test@123',
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
  await page.goto('/');
  
  // Wait for the login form to be ready
  await page.waitForSelector('[data-testid="email-input"]');
  await page.waitForSelector('[data-testid="password-input"]');
  
  // Fill in credentials using test IDs
  await page.fill('[data-testid="email-input"]', TEST_USER.email);
  await page.fill('[data-testid="password-input"]', TEST_USER.password);
  
  // Click submit using test ID and wait for navigation
  await page.click('[data-testid="sign-in-button"]');
  
  // Wait for navigation to complete
  await page.waitForURL('/dashboard', { timeout: 30000 });
}

async function logout(page: Page) {
  // Click the user avatar/menu button
  await page.click('button[aria-label="User menu"]');
  // Click the logout button
  await page.click('button:has-text("Logout")');
  await expect(page).toHaveURL('/');
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
      await expect(page).toHaveURL('/dashboard');
    });

    test('Invalid Login', async ({ page }) => {
      await page.goto('/');
      
      // Fill in form with invalid credentials using test IDs
      await page.fill('[data-testid="email-input"]', TEST_USER.email);
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="sign-in-button"]');
      
      // Wait for error message to appear
      try {
        await page.waitForSelector('[data-testid="error-message"]', { timeout: 5000 });
        // Verify error message is visible
        const errorMessage = await page.locator('[data-testid="error-message"]');
        await expect(errorMessage).toBeVisible();
      } catch (error) {
        throw new Error('Invalid login test failed - error message did not appear');
      }
      
      // Verify we're still on the login page
      await expect(page).not.toHaveURL(/\/dashboard/);
    });

    test('Password Reset Flow', async ({ page }) => {
      // Go to login page
      await page.goto('/');
      
      // Click forgot password link using test ID
      await page.click('[data-testid="forgot-password-button"]');
      
      // Verify we're on the forgot password page
      await expect(page.locator('h1')).toContainText('Reset your password');
      
      // Fill in email using test ID
      await page.fill('[data-testid="forgot-password-email"]', TEST_USER.email);
      
      // Click send reset link button using test ID
      await page.click('[data-testid="send-reset-link-button"]');
      
      // Wait for success toast to appear
      await page.waitForSelector('[data-testid="success-toast"]', { timeout: 5000 });
      
      // Verify success message is shown
      const successToast = page.locator('[data-testid="success-toast"]');
      await expect(successToast).toBeVisible();
      await expect(successToast).toContainText('Password Reset Email Sent');
      
      // Verify we're back on the login page
      await expect(page.locator('h1')).toContainText('Welcome back');
    });
  });

  // Profile Tests
  test.describe('Profile Management', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.goto('/profile');
    });

    test('View Profile', async ({ page }) => {
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator('input[type="text"]')).toBeVisible();
    });

    test('Update Profile', async ({ page }) => {
      const newName = faker.person.fullName();
      await page.fill('input[type="text"]', newName);
      await page.click('button:has-text("Save Changes")');
      await expect(page.locator('text=Changes saved successfully')).toBeVisible();
    });

    test('Change Password', async ({ page }) => {
      // Fill in new password field
      await page.fill('input[type="password"]', TEST_USER.newPassword);
      await page.click('button:has-text("Save Changes")');
      await expect(page.locator('text=Changes saved successfully')).toBeVisible();
      
      // Verify new password works
      await logout(page);
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.newPassword);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/dashboard');

      // Restore original password
      await page.goto('/profile');
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button:has-text("Save Changes")');
      await expect(page.locator('text=Changes saved successfully')).toBeVisible();
      
      // Verify original password works
      await logout(page);
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/dashboard');
    });
  });

  // Expenses Tests
  test.describe('Expense Management', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Add Expense', async ({ page }) => {
      await page.goto('/investments/add');
      await page.fill('input[name="amount"]', '100');
      await page.fill('input[name="description"]', 'Test Expense');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Expense added successfully')).toBeVisible();
    });

    test('Add Installment Expense', async ({ page }) => {
      await page.goto('/investments/add');
      await page.fill('input[name="amount"]', '1000');
      await page.fill('input[name="description"]', 'Test Installment');
      await page.fill('input[name="installments"]', '12');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Installment expense added successfully')).toBeVisible();
    });

    test('Edit Expense', async ({ page }) => {
      const newAmount = '2000';
      // Click the edit button for the expense
      await page.click(`button[aria-label="Edit ${TEST_EXPENSE.description}"]`);
      await page.fill('input[name="amount"]', newAmount);
      await page.click('button:has-text("Save Changes")');
      
      await expect(page.locator('text=Expense updated successfully')).toBeVisible();
      await expect(page.locator(`text=${newAmount}`)).toBeVisible();
    });

    test('Delete Expense', async ({ page }) => {
      // Click the delete button for the expense
      await page.click(`button[aria-label="Delete ${TEST_EXPENSE.description}"]`);
      await page.click('button:has-text("Confirm Delete")');
      
      await expect(page.locator('text=Expense deleted successfully')).toBeVisible();
      await expect(page.locator(`text=${TEST_EXPENSE.description}`)).not.toBeVisible();
    });

    test('Filter Expenses', async ({ page }) => {
      await page.goto('/dashboard');
      await page.click('button:has-text("Filter")');
      await page.fill('input[type="date"]', '2024-01-01');
      await page.click('button:has-text("Apply")');
      await expect(page.locator('text=Filtered Results')).toBeVisible();
    });
  });

  // Dashboard Tests
  test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('View Dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page.locator('text=Total Investment')).toBeVisible();
      await expect(page.locator('text=Portfolio Allocation')).toBeVisible();
    });

    test('View Total Investment', async ({ page }) => {
      const totalInvestment = await page.locator('h2:has-text("Total Investment") + div').textContent();
      expect(totalInvestment).toMatch(/^\d+(\.\d{2})?$/);
    });

    test('View Portfolio Allocation', async ({ page }) => {
      await expect(page.locator('h2:has-text("Portfolio Allocation") + div')).toBeVisible();
      const chartItems = await page.locator('div[role="listitem"]').all();
      expect(chartItems.length).toBeGreaterThan(0);
    });

    test('View Asset Types', async ({ page }) => {
      await expect(page.locator('h2:has-text("Asset Types") + div')).toBeVisible();
      const chartItems = await page.locator('div[role="listitem"]').all();
      expect(chartItems.length).toBeGreaterThan(0);
    });

    test('View Monthly Cash Flow', async ({ page }) => {
      await expect(page.locator('h2:has-text("Monthly Cash Flow") + div')).toBeVisible();
      const income = await page.locator('div:has-text("Income") + div').textContent();
      const expenses = await page.locator('div:has-text("Expenses") + div').textContent();
      expect(income).toMatch(/^\d+(\.\d{2})?$/);
      expect(expenses).toMatch(/^\d+(\.\d{2})?$/);
    });
  });

  // Global Features Tests
  test.describe('Global Features', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('Language Switch', async ({ page }) => {
      await page.goto('/dashboard');
      await page.click('button:has-text("العربية")');
      await expect(page.locator('text=الاستثمارات')).toBeVisible();
    });

    test('Mobile Responsiveness', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      await expect(page.locator('button:has-text("Menu")')).toBeVisible();
    });
  });
}); 