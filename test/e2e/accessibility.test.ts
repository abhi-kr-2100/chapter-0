import { describe, expect, it } from "bun:test";
import AxeBuilder from "@axe-core/playwright";
import { setupE2EFixture } from "../fixtures/e2e";

describe("Accessibility (A11y via axe-core)", () => {
  const fixture = setupE2EFixture();

  it("passes WCAG 2.1 AA and best practices on the landing page in light mode", async () => {
    const { page, baseUrl } = fixture;
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(baseUrl);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  it("passes WCAG 2.1 AA and color contrast in dark mode", async () => {
    const { page, baseUrl } = fixture;
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(baseUrl);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  it("has valid landmark structure and heading hierarchy", async () => {
    const { page, baseUrl } = fixture;
    await page.goto(baseUrl);

    const mainResults = await new AxeBuilder({ page })
      .withRules(["landmark-one-main", "page-has-heading-one", "heading-order"])
      .analyze();

    expect(mainResults.violations).toEqual([]);
    const passedRuleIds = mainResults.passes.map((r) => r.id);
    expect(passedRuleIds).toContain("landmark-one-main");
    expect(passedRuleIds).toContain("page-has-heading-one");
  });

  it("ensures interactive elements have accessible names and pass focus checks", async () => {
    const { page, baseUrl } = fixture;
    await page.goto(baseUrl);
    const button = page.locator("button");
    await button.focus();

    const buttonResults = await new AxeBuilder({ page })
      .include("button")
      .withRules(["button-name", "color-contrast", "nested-interactive"])
      .analyze();

    expect(buttonResults.violations).toEqual([]);
  });

  it("supports keyboard tab navigation to interactive controls", async () => {
    const { page, baseUrl } = fixture;
    await page.goto(baseUrl);
    await page.keyboard.press("Tab");

    const isFocused = await page.evaluate(() => {
      const active = document.activeElement;
      return (
        active?.tagName === "BUTTON" &&
        active?.textContent === "Add your first book"
      );
    });

    expect(isFocused).toBe(true);
  });

  it("passes accessibility standards on mobile viewports", async () => {
    const { page, baseUrl } = fixture;
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(baseUrl);

    const mobileResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(mobileResults.violations).toEqual([]);
  });
});
