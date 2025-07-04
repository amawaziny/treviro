const { execSync } = require("child_process");
const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");

// Load e2e environment variables
const envPath = path.join(__dirname, "../e2e/.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Set NODE_ENV to test
process.env.NODE_ENV = "test";

// Ensure we're using a test database
process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./test.db";

// Set default port if not specified
const port = process.env.BASE_URL ? new URL(process.env.BASE_URL).port : 9003;

console.log("Starting test server with environment:", process.env.NODE_ENV);
console.log("Database URL:", process.env.DATABASE_URL);
console.log(
  "Server will be available at:",
  process.env.BASE_URL || `http://localhost:${port}`,
);

// Disable Turbopack for tests
process.env.TURBOPACK = "0";

// Start the server using pnpm without Turbopack
execSync(`pnpm next dev --turbopack -p ${port}`, {
  stdio: "inherit",
  env: process.env,
});
