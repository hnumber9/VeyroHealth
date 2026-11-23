import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  test: {
    include: [
      "src/lib/admin-profile-actions.test.ts",
      "src/lib/notification-recipients.test.ts",
      "src/lib/seo-pages.test.ts",
    ],
  },
});
