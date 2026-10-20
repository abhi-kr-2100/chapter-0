import { describe, expect, it } from "bun:test";
import manifest, { dynamic } from "../../src/app/manifest";

describe("manifest", () => {
  it("exports dynamic configuration", () => {
    expect(dynamic).toBe("force-static");
  });

  it("returns the web application manifest with expected properties", () => {
    const data = manifest();
    expect(data.name).toBe("Chapter 0");
    expect(data.short_name).toBe("Chapter 0");
    expect(data.description).toBe("Local-first in-browser document reader");
    expect(data.start_url).toBe("/");
    expect(data.display).toBe("standalone");
    expect(data.background_color).toBe("#FBFBF9");
    expect(data.theme_color).toBe("#FBFBF9");
    expect(data.icons).toHaveLength(5);

    expect(data.icons).toEqual([
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ]);
  });
});
