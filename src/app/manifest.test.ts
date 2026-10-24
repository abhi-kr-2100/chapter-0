import { describe, expect, it } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import manifest, { dynamic } from "./manifest";

describe("manifest", () => {
  it("exports dynamic configuration as force-static", () => {
    expect(dynamic).toBe("force-static");
  });

  it("returns web app manifest smoke-tested against README.md and tokens.stylex.ts", async () => {
    const readmeContent = await fs.readFile(path.resolve("README.md"), "utf8");
    const tokensContent = await fs.readFile(
      path.resolve("src/styles/tokens.stylex.ts"),
      "utf8",
    );
    const backgroundMatch = tokensContent.match(
      /background:\s*\{[\s\S]*?default:\s*"(#[A-Fa-f0-9]{6})"/,
    );
    if (!backgroundMatch) {
      throw new Error(
        "Expected default background color token in tokens.stylex.ts",
      );
    }
    const defaultBackgroundColor = backgroundMatch[1];
    if (!defaultBackgroundColor) {
      throw new Error("Expected captured default background color");
    }

    const result = manifest();

    if (!result.name || !result.short_name || !result.description) {
      throw new Error("Expected manifest metadata fields to be defined");
    }

    expect(result.name.length).toBeGreaterThan(0);
    expect(readmeContent).toContain(result.name);

    expect(result.short_name.length).toBeGreaterThan(0);
    expect(result.short_name).toBe(result.name);
    expect(readmeContent).toContain(result.short_name);

    expect(result.description.length).toBeGreaterThan(0);
    expect(readmeContent.toLowerCase()).toContain(
      result.description.toLowerCase(),
    );

    expect(result.start_url).toBe("/");
    expect(result.display).toBe("standalone");
    expect(result.background_color).toBe(defaultBackgroundColor);
    expect(result.theme_color).toBe(defaultBackgroundColor);

    expect(result.icons).toBeDefined();
    if (!result.icons) {
      throw new Error("Expected icons to be defined");
    }

    expect(result.icons.length).toBe(5);

    expect(result.icons[0]).toEqual({
      src: "/icons/icon.svg",
      sizes: "any",
      type: "image/svg+xml",
    });

    expect(result.icons[1]).toEqual({
      src: "/icons/icon-192.png",
      sizes: "192x192",
      type: "image/png",
    });

    expect(result.icons[2]).toEqual({
      src: "/icons/icon-512.png",
      sizes: "512x512",
      type: "image/png",
    });

    expect(result.icons[3]).toEqual({
      src: "/icons/icon-maskable.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "maskable",
    });

    expect(result.icons[4]).toEqual({
      src: "/icons/icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    });

    for (const icon of result.icons) {
      const iconPath = path.resolve("public", icon.src.replace(/^\//, ""));
      const stat = await fs.stat(iconPath);
      expect(stat.isFile()).toBe(true);
      expect(stat.size).toBeGreaterThan(0);
    }
  });
});
