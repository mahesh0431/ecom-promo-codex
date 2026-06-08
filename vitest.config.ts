import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    globalSetup: ["./tests/setup/global-setup.ts"],
    setupFiles: ["./tests/setup/test-env.ts"],
    pool: "forks",
    fileParallelism: false,
    exclude: [
      "**/.git/**",
      "**/.next/**",
      "**/coverage/**",
      "**/node_modules/**",
      "output/**",
      "src/generated/**"
    ]
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
});
