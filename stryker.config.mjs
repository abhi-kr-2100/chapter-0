// @ts-check
/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  testRunner: "command",
  commandRunner: {
    command: "bun --config=bunfig.stryker.toml test",
  },
  coverageAnalysis: "off",
  inPlace: true,
  disableTypeChecks: false,
  mutate: ["src/components/ui/button.tsx"],
  reporters: ["clear-text", "progress"],
  concurrency: 1,
};
