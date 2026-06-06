import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@openai/codex-sdk", "@openai/codex"],
  outputFileTracingExcludes: {
    "/*": [
      "./docs/**/*",
      "./output/**/*",
      "./tests/**/*",
      "./*.tsbuildinfo",
      "./eslint.config.mjs",
      "./next.config.ts",
      "./vitest.config.ts"
    ]
  }
};

export default nextConfig;
