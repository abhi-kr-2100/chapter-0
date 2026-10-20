import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { Cantarell, Petit_Formal_Script } from "next/font/google";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "../../src/components/ui/button";
import { colors, typography } from "../../src/styles/tokens.stylex";
import { OUT_DIR, setupE2EFixture } from "../fixtures/e2e";

describe("Landing Page (E2E)", () => {
  const fixture = setupE2EFixture();

  it("loads the page with HTTP 200 and correct title", async () => {
    const { page, baseUrl } = fixture;
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    const response = await page.goto(baseUrl, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);

    const title = await page.title();
    expect(title).toBe("Chapter 0");
    expect(consoleErrors).toHaveLength(0);
  });

  it("displays the empty state heading, description, and button", async () => {
    const { page, baseUrl } = fixture;
    await page.goto(baseUrl);

    const content = await page.evaluate(() => {
      const heading = document.querySelector("h1");
      const description = document.querySelector("p");
      const button = document.querySelector("button");

      return {
        headingText: heading?.textContent,
        headingVisible: heading !== null && heading.offsetParent !== null,
        descriptionText: description?.textContent,
        descriptionVisible:
          description !== null && description.offsetParent !== null,
        buttonText: button?.textContent,
        buttonVisible: button !== null && button.offsetParent !== null,
      };
    });

    expect(content.headingVisible).toBe(true);
    expect(content.headingText).toBe("No books yet.");
    expect(content.descriptionVisible).toBe(true);
    expect(content.descriptionText).toBe("Add a book to start reading.");
    expect(content.buttonVisible).toBe(true);
    expect(content.buttonText).toBe("Add your first book");

    const petitFont = Petit_Formal_Script({
      weight: "400",
      subsets: ["latin"],
      variable: "--font-petit",
    });
    const cantarellFont = Cantarell({
      weight: ["400", "700"],
      subsets: ["latin"],
      variable: "--font-cantarell",
    });
    expect(petitFont.variable).toBe("--font-petit");
    expect(cantarellFont.variable).toBe("--font-cantarell");
    expect(typography.fontScript).toBeDefined();
    expect(colors.background).toBeDefined();
  });

  it("falls back to cursive and sans-serif when custom font variables are unavailable", async () => {
    const { page, baseUrl } = fixture;
    await page.goto(baseUrl);

    const fallbackFonts = await page.evaluate(() => {
      // Remove font classes and unset custom properties to simulate unavailable web fonts
      document.documentElement.className = "";
      document.documentElement.style.removeProperty("--font-petit");
      document.documentElement.style.removeProperty("--font-cantarell");

      const heading = document.querySelector("h1");
      const description = document.querySelector("p");

      return {
        headingFont: heading ? window.getComputedStyle(heading).fontFamily : "",
        descriptionFont: description
          ? window.getComputedStyle(description).fontFamily
          : "",
      };
    });

    expect(fallbackFonts.headingFont).toBe("cursive");
    expect(fallbackFonts.descriptionFont).toBe("sans-serif");
  });

  it("supports clicking the call-to-action button", async () => {
    const { page, baseUrl } = fixture;
    await page.goto(baseUrl);
    const button = page.locator("button");

    await button.hover();
    await button.click();
    await expect(button.isVisible()).resolves.toBe(true);
  });

  it("ensures disabled button receives pointer events and displays not-allowed cursor", async () => {
    const { page, baseUrl } = fixture;
    const html = fs.readFileSync(path.join(OUT_DIR, "index.html"), "utf-8");
    const cssMatch = html.match(/href="(\/_next\/static\/chunks\/[^"]+\.css)"/);
    const cssHref = cssMatch ? `${baseUrl}${cssMatch[1]}` : "";

    const buttonHtml = renderToStaticMarkup(
      React.createElement(
        Button,
        { disabled: true, id: "disabled-btn" },
        "Disabled Action",
      ),
    );

    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="stylesheet" href="${cssHref}">
        </head>
        <body style="margin: 0; padding: 20px;">
          <div id="container" style="padding: 20px;">
            ${buttonHtml}
          </div>
        </body>
      </html>
    `);
    await page.waitForLoadState("networkidle");

    const button = page.locator("#disabled-btn");
    const targetElement = await page.evaluate(() => {
      const btn = document.getElementById("disabled-btn");
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      const el = document.elementFromPoint(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
      );
      const computed = window.getComputedStyle(btn);
      return {
        tag: el?.tagName,
        pointerEvents: computed.pointerEvents,
        cursor: computed.cursor,
      };
    });

    expect(targetElement?.pointerEvents).toBe("auto");
    expect(targetElement?.cursor).toBe("not-allowed");
    expect(targetElement?.tag).toBe("BUTTON");

    await button.hover();
  });

  it("activates the call-to-action button via Enter and Space keys", async () => {
    const { page, baseUrl } = fixture;
    await page.goto(baseUrl);

    await page.evaluate(() => {
      let clickCount = 0;
      const btn = document.querySelector("button");
      btn?.addEventListener("click", () => {
        clickCount++;
      });
      (window as unknown as { __btnClickCount: () => number }).__btnClickCount =
        () => clickCount;
    });

    const button = page.locator("button");
    await button.focus();

    await page.keyboard.press("Enter");
    const clicksAfterEnter = await page.evaluate(() =>
      (
        window as unknown as { __btnClickCount: () => number }
      ).__btnClickCount(),
    );
    expect(clicksAfterEnter).toBe(1);

    await page.keyboard.press("Space");
    const clicksAfterSpace = await page.evaluate(() =>
      (
        window as unknown as { __btnClickCount: () => number }
      ).__btnClickCount(),
    );
    expect(clicksAfterSpace).toBe(2);
  });

  it("renders responsively without horizontal overflow on mobile", async () => {
    const { page, baseUrl } = fixture;
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(baseUrl);

    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(isOverflowing).toBe(false);

    const button = page.locator("button");
    await expect(button.isVisible()).resolves.toBe(true);
  });

  it("serves manifest and icons over HTTP with correct responses", async () => {
    const { baseUrl } = fixture;
    const manifestRes = await fetch(`${baseUrl}/manifest.webmanifest`);
    expect(manifestRes.status).toBe(200);
    const manifest = (await manifestRes.json()) as { name: string };
    expect(manifest.name).toBe("Chapter 0");

    const iconSvgRes = await fetch(`${baseUrl}/icons/icon.svg`);
    expect(iconSvgRes.status).toBe(200);
    expect(iconSvgRes.headers.get("content-type")).toContain("image/svg+xml");

    const iconPngRes = await fetch(`${baseUrl}/icons/icon-192.png`);
    expect(iconPngRes.status).toBe(200);

    const faviconSvgRes = await fetch(`${baseUrl}/favicon.svg`);
    expect(faviconSvgRes.status).toBe(200);

    const faviconIcoRes = await fetch(`${baseUrl}/favicon.ico`);
    expect(faviconIcoRes.status).toBe(200);
  });
});
