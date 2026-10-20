import { beforeAll, describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { Window } from "happy-dom";
import { ensureBuild } from "../fixtures/build";

const outDir = path.resolve("out");

describe("PWA Assets & Installation Config (Integration)", () => {
  beforeAll(() => {
    ensureBuild();
  }, 30000);

  it("verifies service worker file exists in static export directory for offline delivery", () => {
    const swPath = path.join(outDir, "sw.js");
    expect(fs.existsSync(swPath)).toBe(true);

    const content = fs.readFileSync(swPath, "utf8");
    const cacheMatch = content.match(
      /const CACHE_NAME = "(chapter0-[0-9a-f]+)";/,
    );
    expect(cacheMatch).not.toBeNull();

    expect(content).toContain('"/index.html"');
    expect(content).toContain('"/"');
    expect(content).toContain('"/manifest.webmanifest"');
    expect(content).toContain('"/_next/static/');
  });

  it("verifies manifest.webmanifest satisfies PWA installation standards", () => {
    const manifestPath = path.join(outDir, "manifest.webmanifest");
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    expect(manifest.name).toBe("Chapter 0");
    expect(manifest.short_name).toBe("Chapter 0");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.background_color).toBe("#FBFBF9");
    expect(manifest.theme_color).toBe("#FBFBF9");
    expect(manifest.description).toBeDefined();

    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(4);

    const sizes = manifest.icons.map((icon: { sizes?: string }) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");

    const maskableIcons = manifest.icons.filter(
      (icon: { purpose?: string }) => icon.purpose === "maskable",
    );
    expect(maskableIcons.length).toBeGreaterThanOrEqual(1);
  });

  it("verifies all PWA icons have valid binary headers and dimensions", () => {
    const manifestPath = path.join(outDir, "manifest.webmanifest");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    const pngMagic = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    for (const icon of manifest.icons as Array<{
      src: string;
      sizes?: string;
      type?: string;
    }>) {
      const relPath = icon.src.startsWith("/") ? icon.src.slice(1) : icon.src;
      const iconPath = path.join(outDir, relPath);

      expect(fs.existsSync(iconPath)).toBe(true);
      const buffer = fs.readFileSync(iconPath);
      expect(buffer.length).toBeGreaterThan(0);

      if (icon.src.endsWith(".png") || icon.type === "image/png") {
        const header = buffer.subarray(0, 8);
        expect(header.equals(pngMagic)).toBe(true);

        if (icon.sizes) {
          const [expectedWidth, expectedHeight] = icon.sizes
            .split("x")
            .map(Number);
          const width = buffer.readUInt32BE(16);
          const height = buffer.readUInt32BE(20);
          expect(width).toBe(expectedWidth);
          expect(height).toBe(expectedHeight);
        }
      } else if (icon.src.endsWith(".svg") || icon.type === "image/svg+xml") {
        const svgContent = buffer.toString("utf8");
        expect(svgContent.trim().startsWith("<svg")).toBe(true);
        expect(svgContent).toContain("</svg>");
      } else {
        expect.unreachable(
          `Unsupported icon format or type for ${icon.src}: ${icon.type}`,
        );
      }
    }
  });

  it("verifies index.html has complete PWA installation metadata in document head", () => {
    const htmlPath = path.join(outDir, "index.html");
    expect(fs.existsSync(htmlPath)).toBe(true);

    const html = fs.readFileSync(htmlPath, "utf8");
    const window = new Window();
    window.document.write(html);
    const head = window.document.head;

    // Manifest link
    const manifestLink = head.querySelector('link[rel="manifest"]');
    expect(manifestLink).not.toBeNull();
    expect(manifestLink?.getAttribute("href")).toBe("/manifest.webmanifest");

    // Apple / Mobile web app capability
    const mobileCapable = head.querySelector(
      'meta[name="mobile-web-app-capable"]',
    );
    expect(mobileCapable?.getAttribute("content")).toBe("yes");

    const appleTitle = head.querySelector(
      'meta[name="apple-mobile-web-app-title"]',
    );
    expect(appleTitle?.getAttribute("content")).toBe("Chapter 0");

    const appleStatusBar = head.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]',
    );
    expect(appleStatusBar?.getAttribute("content")).toBe("default");

    const appleTouchIcon = head.querySelector(
      'link[rel="apple-touch-icon"][sizes="192x192"]',
    );
    expect(appleTouchIcon?.getAttribute("href")).toBe("/icons/icon-192.png");
    expect(appleTouchIcon?.getAttribute("type")).toBe("image/png");

    // Theme color metadata for light and dark
    const lightTheme = head.querySelector(
      'meta[name="theme-color"][media="(prefers-color-scheme: light)"]',
    );
    expect(lightTheme?.getAttribute("content")).toBe("#FBFBF9");

    const darkTheme = head.querySelector(
      'meta[name="theme-color"][media="(prefers-color-scheme: dark)"]',
    );
    expect(darkTheme?.getAttribute("content")).toBe("#141312");
  });
});
