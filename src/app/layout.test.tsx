import { describe, expect, it } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import RootLayout, { metadata, viewport } from "./layout";
import { ServiceWorkerRegister } from "./sw-register";

describe("RootLayout", () => {
  describe("metadata", () => {
    it("exports metadata smoke-tested against README.md and icon files on disk", async () => {
      const readmeContent = await fs.readFile(
        path.resolve("README.md"),
        "utf8",
      );

      const title = metadata.title;
      if (typeof title !== "string") {
        throw new Error("Expected metadata title to be a string");
      }
      expect(title).toBe("Chapter 0");
      expect(readmeContent).toContain(title);

      const description = metadata.description;
      if (typeof description !== "string") {
        throw new Error("Expected metadata description to be a string");
      }
      expect(description).toBe("Book reader inside your browser");
      expect(readmeContent.toLowerCase()).toContain(description.toLowerCase());

      const icons = metadata.icons;
      if (
        !icons ||
        typeof icons !== "object" ||
        Array.isArray(icons) ||
        !("icon" in icons) ||
        !("apple" in icons)
      ) {
        throw new Error("Expected metadata icons object with icon and apple");
      }

      const iconList = icons.icon;
      if (!Array.isArray(iconList)) {
        throw new Error("Expected metadata icons.icon array");
      }
      expect(iconList.length).toBe(2);
      expect(iconList[0]).toEqual({
        url: "/favicon.svg",
        type: "image/svg+xml",
      });
      expect(iconList[1]).toEqual({
        url: "/favicon.ico",
        sizes: "any",
      });

      const appleList = icons.apple;
      if (!Array.isArray(appleList)) {
        throw new Error("Expected metadata icons.apple array");
      }
      expect(appleList.length).toBe(1);
      expect(appleList[0]).toEqual({
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      });

      const allIcons = [...iconList, ...appleList];
      for (const iconItem of allIcons) {
        if (typeof iconItem !== "object" || !("url" in iconItem)) {
          throw new Error("Expected icon descriptor with url");
        }
        const iconPath = path.resolve(
          "public",
          String(iconItem.url).replace(/^\//, ""),
        );
        const stat = await fs.stat(iconPath);
        expect(stat.isFile()).toBe(true);
        expect(stat.size).toBeGreaterThan(0);
      }

      const appleWebApp = metadata.appleWebApp;
      if (!appleWebApp || typeof appleWebApp !== "object") {
        throw new Error("Expected appleWebApp metadata to be defined");
      }
      expect(appleWebApp.capable).toBe(true);
      expect(appleWebApp.statusBarStyle).toBe("default");
      expect(appleWebApp.title).toBe("Chapter 0");
    });
  });

  describe("viewport", () => {
    it("matches themeColor configurations with tokens.stylex.ts", async () => {
      const tokensContent = await fs.readFile(
        path.resolve("src/styles/tokens.stylex.ts"),
        "utf8",
      );

      const lightBgMatch = tokensContent.match(
        /background:\s*\{[\s\S]*?default:\s*"(#[A-Fa-f0-9]{6})"/,
      );
      if (!lightBgMatch) {
        throw new Error(
          "Expected default background color token in tokens.stylex.ts",
        );
      }
      const lightBg = lightBgMatch[1];
      if (!lightBg) {
        throw new Error("Expected captured light background color");
      }

      const darkBgMatch = tokensContent.match(
        /@media \(prefers-color-scheme: dark\)"?:\s*"(#[A-Fa-f0-9]{6})"/,
      );
      if (!darkBgMatch) {
        throw new Error(
          "Expected dark background color token in tokens.stylex.ts",
        );
      }
      const darkBg = darkBgMatch[1];
      if (!darkBg) {
        throw new Error("Expected captured dark background color");
      }

      const themeColor = viewport.themeColor;
      if (!Array.isArray(themeColor)) {
        throw new Error("Expected viewport themeColor to be an array");
      }
      expect(themeColor.length).toBe(2);
      expect(themeColor[0]).toEqual({
        media: "(prefers-color-scheme: light)",
        color: lightBg,
      });
      expect(themeColor[1]).toEqual({
        media: "(prefers-color-scheme: dark)",
        color: darkBg,
      });
    });
  });

  describe("component", () => {
    it("returns correct JSX structure with fonts, style classes, children, and ServiceWorkerRegister", () => {
      const testChild = <main id="reader-root">Content</main>;
      const rootElement = RootLayout({ children: testChild });

      expect(rootElement.type).toBe("html");
      expect(rootElement.props.lang).toBe("en");
      expect(rootElement.props.className).toContain("--font-petit");
      expect(rootElement.props.className).toContain("--font-cantarell");
      expect(rootElement.props.className.trim().length).toBeGreaterThan(0);

      const bodyElement = rootElement.props.children as ReactElement<{
        className: string;
        children: [ReactNode, ReactNode];
      }>;
      expect(bodyElement.type).toBe("body");
      expect(bodyElement.props.className.trim().length).toBeGreaterThan(0);

      const [childNode, swNode] = bodyElement.props.children;
      expect(childNode).toBe(testChild);

      const swElement = swNode as ReactElement;
      expect(swElement.type).toBe(ServiceWorkerRegister);
    });

    it("renders full static HTML document including child content", () => {
      const testChild = <main id="test-main">Document Reader</main>;
      const html = renderToStaticMarkup(<RootLayout>{testChild}</RootLayout>);

      expect(html.startsWith("<html")).toBe(true);
      expect(html).toContain('lang="en"');
      expect(html).toContain("--font-petit");
      expect(html).toContain("--font-cantarell");
      expect(html).toContain("<body");
      expect(html).toContain('<main id="test-main">Document Reader</main>');
      expect(html.endsWith("</html>")).toBe(true);
    });
  });
});
