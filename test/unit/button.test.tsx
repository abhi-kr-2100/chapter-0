import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "../../src/components/ui/button";

describe("Button", () => {
  it("renders enabled button with default props", () => {
    const html = renderToStaticMarkup(
      <Button id="test-btn" aria-label="Action button">
        Click me
      </Button>,
    );
    expect(html).toContain('type="button"');
    expect(html).toContain('data-slot="button"');
    expect(html).toContain('id="test-btn"');
    expect(html).toContain('aria-label="Action button"');
    expect(html).toContain("Click me");
    expect(html).not.toContain("disabled");
  });

  it("renders disabled button with explicit variant and size", () => {
    const html = renderToStaticMarkup(
      <Button disabled variant="primary" size="default">
        Disabled
      </Button>,
    );
    expect(html).toContain('type="button"');
    expect(html).toContain('disabled=""');
    expect(html).toContain("Disabled");
  });

  it("renders enabled button with explicitly false disabled and default variant", () => {
    const html = renderToStaticMarkup(
      <Button disabled={false} variant="default">
        Active
      </Button>,
    );
    expect(html).toContain('type="button"');
    expect(html).not.toContain("disabled");
    expect(html).toContain("Active");
  });

  it("preserves StyleX classes when custom className is provided", () => {
    const html = renderToStaticMarkup(
      <Button className="custom-class">With custom class</Button>,
    );
    expect(html).toContain("custom-class");
    const classMatch = html.match(/class="([^"]+)"/);
    expect(classMatch).not.toBeNull();
    const classes = classMatch?.[1].split(" ") ?? [];
    expect(classes).toContain("custom-class");
    expect(classes.filter((c) => c !== "custom-class").length).toBeGreaterThan(
      0,
    );
  });

  it("preserves StyleX disabled classes when custom className is provided to disabled button", () => {
    const enabledHtml = renderToStaticMarkup(
      <Button className="custom-class">Enabled</Button>,
    );
    const disabledHtml = renderToStaticMarkup(
      <Button disabled className="custom-class">
        Disabled with custom class
      </Button>,
    );
    expect(disabledHtml).toContain("custom-class");

    const enabledClasses =
      enabledHtml.match(/class="([^"]+)"/)?.[1].split(" ") ?? [];
    const disabledClasses =
      disabledHtml.match(/class="([^"]+)"/)?.[1].split(" ") ?? [];

    expect(disabledClasses).toContain("custom-class");
    expect(disabledClasses).not.toEqual(enabledClasses);
    expect(disabledClasses.length).toBeGreaterThan(0);
    const nonCustomClasses = disabledClasses.filter(
      (c) => c !== "custom-class",
    );
    expect(nonCustomClasses.length).toBeGreaterThan(0);
    const disabledOnlyClasses = disabledClasses.filter(
      (c) => !enabledClasses.includes(c),
    );
    expect(disabledOnlyClasses.length).toBeGreaterThan(0);
  });

  it("does not disable pointer events on disabled button so not-allowed cursor takes effect", () => {
    const html = renderToStaticMarkup(
      <Button disabled>Disabled button</Button>,
    );
    expect(html).toContain('disabled=""');
    // pointer-events: none (StyleX class x47corl) must not be applied to disabled button
    expect(html).not.toContain("x47corl");
  });
});
