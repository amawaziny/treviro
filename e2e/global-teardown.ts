export default async function globalTeardown() {
  // Kill the server process if it exists
  if ((global as any).__SERVER_PROCESS__) {
    try {
      process.kill(-(global as any).__SERVER_PROCESS__.pid, "SIGKILL");
    } catch (error) {
      console.error("Error stopping server:", error);
    }
  }
}
