# Treviro End-to-End Tests

This directory contains end-to-end tests for the Treviro application using Playwright.

## Prerequisites

- Node.js 16 or later
- npm or yarn

## Setup

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

3. Set up environment variables:
```bash
# Create a .env file with the following variables
TEST_USER_EMAIL=your_test_user@example.com
TEST_USER_PASSWORD=your_test_password
BASE_URL=http://localhost:3000  # or your staging/production URL
```

## Running Tests

1. Run all tests:
```bash
npm test
# or
yarn test
```

2. Run tests with UI mode (for debugging):
```bash
npm run test:ui
# or
yarn test:ui
```

3. Run tests in debug mode:
```bash
npm run test:debug
# or
yarn test:debug
```

4. Run tests on specific browsers:
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

5. Run tests on mobile devices:
```bash
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

## Test Structure

The tests are organized into the following sections:

1. **Authentication**
   - Login
   - Password reset

2. **Profile Management**
   - View profile
   - Update profile
   - Change password

3. **Expense Management**
   - Add expense
   - Add installment expense
   - Edit expense
   - Delete expense
   - Filter expenses

4. **Dashboard**
   - Total investment
   - Portfolio allocation
   - Asset types
   - Monthly cash flow

5. **Global Features**
   - Language switching
   - Mobile responsiveness

## Test Data

The tests use the following test data:
- Test user credentials (from environment variables)
- Sample expense data
- Generated data using Faker.js

## Continuous Integration

The tests are configured to run in CI environments with:
- Retries on failure
- Parallel execution
- HTML reports
- Screenshots on failure
- Trace collection

## Debugging

1. Use UI mode for visual debugging:
```bash
npm run test:ui
```

2. Use debug mode for step-by-step debugging:
```bash
npm run test:debug
```

3. View test reports:
```bash
npx playwright show-report
```

## Best Practices

1. Always use data-testid attributes for selectors
2. Keep tests independent and isolated
3. Clean up test data after each test
4. Use meaningful test descriptions
5. Handle both success and failure cases
6. Test on multiple browsers and devices
7. Verify both UI and functionality 