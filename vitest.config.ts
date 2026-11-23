import { defineConfig } from "vitest/config";

// Standalone test config: uses only the "@" alias (not the app's Vite plugins),
// so server functions run as plain functions under test.
export default defineConfig({
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  test: { include: ["src/**/*.test.{ts,tsx}"] },
});
