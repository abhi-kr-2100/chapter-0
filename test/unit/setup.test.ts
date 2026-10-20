import { describe, expect, it } from "bun:test";
import { assertBuildSuccess, ensureBuild } from "../fixtures/build";

describe("assertBuildSuccess", () => {
  it("succeeds when build exitCode is 0", () => {
    expect(() => assertBuildSuccess({ exitCode: 0 })).not.toThrow();
  });

  it("throws when build exitCode is non-zero", () => {
    expect(() => assertBuildSuccess({ exitCode: 1 })).toThrow(
      "Build failed with exit code 1",
    );
  });
});

describe("ensureBuild", () => {
  it("builds initially, returns early on subsequent calls, and rebuilds when forced", () => {
    expect(() => ensureBuild()).not.toThrow();
    expect(() => ensureBuild(false)).not.toThrow();
    expect(() => ensureBuild(true)).not.toThrow();
  }, 30000);
});
