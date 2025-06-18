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

test.describe("Profile Management", () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and storage before each test
    await page.context().clearCookies();
    await login(page);
    // Navigate to profile page
    await page.goto("/profile");
    await page.waitForSelector('[data-testid="profile-page"]');
  });

  test("should display profile information correctly", async ({ page }) => {
    // Verify profile elements are visible
    await expect(page.getByTestId("profile-title")).toBeVisible();
    await expect(page.getByTestId("profile-image")).toBeVisible();
    await expect(page.getByTestId("profile-name")).toBeVisible();
    await expect(page.getByTestId("profile-email")).toHaveText(TEST_USER.email);
    await expect(page.getByTestId("name-input")).toBeVisible();
  });

  test("should update profile name", async ({ page }) => {
    const newName = "Updated Test User";

    // Update name
    await page.fill('[data-testid="name-input"]', newName);
    await page.click('[data-testid="save-button"]');

    // Verify success message
    await expect(page.getByTestId("success-message")).toBeVisible();
    await expect(page.getByTestId("success-message")).toContainText(
      "Profile updated successfully",
    );

    // Refresh and verify name persists
    await page.reload();
    await expect(page.getByTestId("name-input")).toHaveValue(newName);
    await expect(page.getByTestId("profile-name")).toContainText(newName);
  });

  // test('should show error for invalid profile image URL', async ({ page }) => {
  //   const invalidUrl = 'not-a-valid-url';

  //   // Try to save with invalid URL
  //   await page.fill('[data-testid="image-url-input"]', invalidUrl);
  //   await page.click('[data-testid="save-button"]');

  //   // Verify error message
  //   await expect(page.getByTestId('error-message')).toBeVisible();
  // });

  test("should toggle password visibility", async ({ page }) => {
    // Check if password field is for password provider users
    const isPasswordUser =
      (await page.locator('[data-testid="password-input"]').count()) > 0;

    if (isPasswordUser) {
      // Password should be hidden by default
      await expect(page.getByTestId("password-input")).toHaveAttribute(
        "type",
        "password",
      );

      // Toggle visibility
      await page.click('[data-testid="password-toggle-button"]');

      // Password should be visible
      await expect(page.getByTestId("password-input")).toHaveAttribute(
        "type",
        "text",
      );

      // Toggle back
      await page.click('[data-testid="password-toggle-button"]');

      // Password should be hidden again
      await expect(page.getByTestId("password-input")).toHaveAttribute(
        "type",
        "password",
      );
    } else {
      // Skip test for non-password users
      test.skip();
    }
  });

  test("should show loading state when saving", async ({ page }) => {
    // Start saving
    const savePromise = page.click('[data-testid="save-button"]');

    // Verify loading state
    await expect(page.getByTestId("save-button")).toBeDisabled();

    // Wait for save to complete
    await savePromise;

    // Button should be enabled again
    await expect(page.getByTestId("save-button")).toBeEnabled();
  });

  test("should show upload status when uploading image", async ({ page }) => {
    // Skip if not a password user (no upload button)
    const isPasswordUser =
      (await page.locator('[data-testid="image-upload-input"]').count()) > 0;
    test.skip(!isPasswordUser, "Skipping upload test for non-password users");

    // Mock file upload (we're not actually uploading in test)
    await page.setInputFiles('[data-testid="image-upload-input"]', {
      name: "test.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("test"),
    });

    // Verify upload status is shown
    await expect(page.getByTestId("uploading-message")).toBeVisible();
  });
});
