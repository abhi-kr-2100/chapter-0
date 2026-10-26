// @ts-check
/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  incremental: true,
  testRunner: "command",
  commandRunner: {
    command: "bun --config=bunfig.stryker.toml test --bail=1",
  },
  coverageAnalysis: "off",
  inPlace: false,
  concurrency: 4,
  cleanTempDir: "always",
  // Bypass Stryker TS preprocessor bug with Bun & TS 7
  tsconfigFile: "does-not-exist.json",
  ignorePatterns: [".direnv", ".jj", ".next", "dist", "out"],
  disableTypeChecks: false,
  mutate: [
    "src/**/*.{ts,tsx}",
    "scripts/**/*.ts",
    "!src/**/*.test.{ts,tsx}",
    "!scripts/**/*.test.ts",
    "!src/styles/tokens.stylex.ts",
    "!src/app/layout.tsx",
    "!src/app/sw-register.tsx",
  ],
  reporters: ["clear-text", "progress", "html"],
  thresholds: {
    high: 100,
    low: 100,
    break: 100,
  },
};
