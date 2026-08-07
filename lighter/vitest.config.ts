import { defineConfig } from "vitest/config";

// Scoped narrowly to pure, framework-free logic (currently just the onboarding gate
// conditions) — not a full React Native component-testing setup. This exists because the
// gate-condition bug that cost a live user four burned accounts needed a regression test,
// and there was nowhere to put one.
export default defineConfig({
  test: {
    environment: "node",
    include: ["hooks/**/*.test.ts"],
  },
});
