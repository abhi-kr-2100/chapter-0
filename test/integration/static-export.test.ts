import { beforeAll, describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { Window } from "happy-dom";
import getManifest from "../../src/app/manifest";
import { assertBuildSuccess, ensureBuild } from "../fixtures/build";

const outDir = path.resolve("out");

describe("Static Export (Integration)", () => {
  beforeAll(() => {
    ensureBuild();
  }, 30000);

  it("verifies build success assertion helper logic", () => {
    expect(() => assertBuildSuccess({ exitCode: 0 })).not.toThrow();
    expect(() => assertBuildSuccess({ exitCode: 1 })).toThrow(
      "Build failed with exit code 1",
    );
  });

  it("exports index.html with correct structure, metadata, and fonts", () => {
    const htmlPath = path.join(outDir, "index.html");
    expect(fs.existsSync(htmlPath)).toBe(true);

    const html = fs.readFileSync(htmlPath, "utf8");

    // Doctype and language
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<html lang="en"');

    // Font preloads
    expect(html).toContain('as="font"');
    expect(html).toContain('type="font/woff2"');

    const window = new Window();
    window.document.write(html);
    const head = window.document.head;

    // Head Metadata
    expect(head.querySelector("title")?.textContent).toBe("Chapter 0");
    const description = head.querySelector('meta[name="description"]');
    expect(description?.getAttribute("content")).toBe(
      "Read books inside your browser",
    );
    const lightTheme = head.querySelector(
      'meta[name="theme-color"][media="(prefers-color-scheme: light)"]',
    );
    expect(lightTheme?.getAttribute("content")).toBe("#FBFBF9");
    const darkTheme = head.querySelector(
      'meta[name="theme-color"][media="(prefers-color-scheme: dark)"]',
    );
    expect(darkTheme?.getAttribute("content")).toBe("#141312");

    // Favicon and Manifest Links
    const faviconSvg = head.querySelector(
      'link[rel="icon"][href="/favicon.svg"]',
    );
    expect(faviconSvg).not.toBeNull();
    const faviconIco = head.querySelector(
      'link[rel="icon"][href="/favicon.ico"]',
    );
    expect(faviconIco).not.toBeNull();
    const manifestLink = head.querySelector('link[rel="manifest"]');
    expect(manifestLink?.getAttribute("href")).toBe("/manifest.webmanifest");

    // Content and StyleX atomic classes
    expect(html).toContain("No books yet.");
    expect(html).toContain("Add a book to start reading.");
    expect(html).toContain("Add your first book");
    expect(html).toContain('data-slot="button"');

    // Verify StyleX stylesheet is linked and exists on disk with compiled rules
    const stylesheetMatch = html.match(
      /<link[^>]+rel="stylesheet"[^>]+href="([^"]+\.css)"/,
    );
    expect(stylesheetMatch).not.toBeNull();
    const cssRelPath = stylesheetMatch?.[1].startsWith("/")
      ? stylesheetMatch[1].slice(1)
      : stylesheetMatch?.[1];
    const cssPath = path.join(outDir, cssRelPath ?? "");
    expect(fs.existsSync(cssPath)).toBe(true);

    const cssContent = fs.readFileSync(cssPath, "utf8");
    expect(cssContent).toContain("@layer");

    // Verify the stylesheet contains compiled rules for classes rendered in the document
    const buttonClassMatch = html.match(/<button[^>]+class="([^"]+)"/);
    expect(buttonClassMatch).not.toBeNull();
    const buttonClasses =
      buttonClassMatch?.[1].split(" ").filter(Boolean) ?? [];
    expect(buttonClasses.length).toBeGreaterThan(0);
    const hasMatchingCssRule = buttonClasses.some((cls) =>
      cssContent.includes(`.${cls}`),
    );
    expect(hasMatchingCssRule).toBe(true);
  });

  it("exports manifest.webmanifest with all referenced icons existing on disk", () => {
    const manifestPath = path.join(outDir, "manifest.webmanifest");
    expect(fs.existsSync(manifestPath)).toBe(true);

    const content = fs.readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(content);

    const localManifest = getManifest();
    expect(manifest.name).toBe(localManifest.name);
    expect(manifest.short_name).toBe(localManifest.short_name);
    expect(manifest.start_url).toBe(localManifest.start_url);
    expect(manifest.display).toBe(localManifest.display);
    expect(manifest.background_color).toBe(localManifest.background_color);
    expect(manifest.theme_color).toBe(localManifest.theme_color);

    expect(manifest.icons).toBeInstanceOf(Array);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(4);

    for (const icon of manifest.icons) {
      const relPath = icon.src.startsWith("/") ? icon.src.slice(1) : icon.src;
      const iconPath = path.join(outDir, relPath);
      expect(fs.existsSync(iconPath)).toBe(true);
      const stat = fs.statSync(iconPath);
      expect(stat.size).toBeGreaterThan(0);
    }
  });

  it("exports valid favicon files", () => {
    const icoPath = path.join(outDir, "favicon.ico");
    const svgPath = path.join(outDir, "favicon.svg");

    expect(fs.existsSync(icoPath)).toBe(true);
    const icoBuffer = fs.readFileSync(icoPath);
    expect(icoBuffer.length).toBeGreaterThan(0);
    const icoHeader = icoBuffer.subarray(0, 4);
    expect(icoHeader.equals(Buffer.from([0x00, 0x00, 0x01, 0x00]))).toBe(true);

    expect(fs.existsSync(svgPath)).toBe(true);
    const svg = fs.readFileSync(svgPath, "utf8");
    expect(svg.trim().startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
  });
});
