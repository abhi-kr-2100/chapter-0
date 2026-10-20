import { describe, expect, it } from "bun:test";
import { stylexOptions, stylexPluginItem } from "../../stylex.config";

describe("stylex.config", () => {
  it("defines stylex options correctly", () => {
    expect(stylexOptions.runtimeInjection).toBe(false);
    expect(stylexOptions.treeshakeCompensation).toBe(true);
    expect(stylexOptions.unstable_moduleResolution?.type).toBe("commonJS");
    if (stylexOptions.unstable_moduleResolution?.type === "commonJS") {
      expect(stylexOptions.unstable_moduleResolution.rootDir).toBeDefined();
    }
  });

  it("exports plugin tuple", () => {
    expect(stylexPluginItem).toHaveLength(2);
    expect(typeof stylexPluginItem[0]).toBe("function");
    expect(stylexPluginItem[1]).toBe(stylexOptions);
  });
});
