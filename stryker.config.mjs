// @ts-check
/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  incremental: true,
  testRunner: "command",
  commandRunner: {
    command: "bun --config=bunfig.stryker.toml test",
  },
  coverageAnalysis: "off",
  inPlace: true,
  disableTypeChecks: false,
  mutate: [
    "src/components/ui/button.tsx",
    "src/components/ui/UpdateBanner.tsx",
    "src/components/library/EmptyState.tsx",
    "src/app/page.tsx",
    "src/app/manifest.ts",
    "scripts/generate-sw.ts",
  ],
  reporters: ["clear-text", "progress"],
  concurrency: 1,
};
