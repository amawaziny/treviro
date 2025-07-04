import { FullConfig } from "@playwright/test";
import { spawn } from "child_process";
import { join } from "path";

export default async function globalSetup(config: FullConfig) {
  // Start the server if not already running
  if (!process.env.CI) {
    // Load e2e environment variables
    const envPath = join(__dirname, ".env");
    if (require("fs").existsSync(envPath)) {
      require("dotenv").config({ path: envPath });
    }

    // Get the base URL from environment or use default
    const baseUrl = process.env.BASE_URL || "http://localhost:9003";
    const url = new URL(baseUrl);
    const port = url.port || "9003";

    const serverProcess = spawn("node", ["scripts/test-server.js"], {
      cwd: join(__dirname, ".."),
      shell: true,
      detached: true,
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "test",
        PORT: port,
        BASE_URL: baseUrl,
        DATABASE_URL: process.env.DATABASE_URL || "file:./test.db",
      },
    });

    // Store the server process so we can kill it later
    (global as any).__SERVER_PROCESS__ = serverProcess;

    // Wait for the server to be ready
    await new Promise<void>((resolve) => {
      const checkServer = setInterval(() => {
        fetch(baseUrl)
          .then(() => {
            clearInterval(checkServer);
            resolve();
          })
          .catch(() => {});
      }, 1000);
    });
  }
}
