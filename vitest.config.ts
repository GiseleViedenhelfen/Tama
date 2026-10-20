import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles:
      process.env.RUN_INTEGRATION_TESTS === "1"
        ? ["tests/integration/setup.ts"]
        : [],
    fileParallelism: process.env.RUN_INTEGRATION_TESTS === "1" ? false : true,
  },
});
