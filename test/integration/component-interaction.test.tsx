import { describe, expect, it } from "bun:test";
import { Cantarell, Petit_Formal_Script } from "next/font/google";
import Home from "../../src/app/page";
import { EmptyState } from "../../src/components/library/EmptyState";
import { Button } from "../../src/components/ui/button";
import { UpdateBanner } from "../../src/components/ui/UpdateBanner";
import { setupDomFixture } from "../fixtures/dom";

describe("Component Interaction (Integration)", () => {
  const fixture = setupDomFixture();

  it("handles real click events on Button", async () => {
    let clickCount = 0;
    await fixture.render(
      <Button onClick={() => clickCount++}>Interactive Button</Button>,
    );

    const button = fixture.container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe("Interactive Button");

    button?.click();
    expect(clickCount).toBe(1);

    button?.click();
    expect(clickCount).toBe(2);
  });

  it("prevents interaction when Button is disabled", async () => {
    let clickCount = 0;
    await fixture.render(
      <Button disabled onClick={() => clickCount++}>
        Disabled Button
      </Button>,
    );

    const button = fixture.container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute("disabled")).toBe("");

    button?.click();
    expect(clickCount).toBe(0);
  });

  it("retains pointer events on disabled Button so not-allowed cursor takes effect", async () => {
    await fixture.render(<Button disabled>Disabled Button</Button>);

    const button = fixture.container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.className).not.toContain("x47corl");
  });

  it("supports focus and keyboard navigation on Button", async () => {
    let focused = false;
    let blurred = false;
    const receivedKeys: string[] = [];

    await fixture.render(
      <Button
        id="focusable-btn"
        onFocus={() => {
          focused = true;
        }}
        onBlur={() => {
          blurred = true;
        }}
        onKeyDown={(e) => {
          receivedKeys.push(e.key);
        }}
      >
        Focusable
      </Button>,
    );

    const button =
      fixture.container.querySelector<HTMLButtonElement>("#focusable-btn");
    expect(button).not.toBeNull();

    button?.focus();
    expect(fixture.window.document.activeElement === (button as unknown)).toBe(
      true,
    );
    expect(focused).toBe(true);

    button?.dispatchEvent(
      new fixture.window.KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      }) as unknown as Event,
    );
    button?.dispatchEvent(
      new fixture.window.KeyboardEvent("keydown", {
        key: " ",
        bubbles: true,
      }) as unknown as Event,
    );
    expect(receivedKeys).toEqual(["Enter", " "]);

    button?.blur();
    expect(fixture.window.document.activeElement === (button as unknown)).toBe(
      false,
    );
    expect(blurred).toBe(true);
  });

  it("merges custom className with StyleX classes on Button", async () => {
    await fixture.render(
      <Button className="custom-button-class">Custom Styled Button</Button>,
    );

    const button = fixture.container.querySelector("button");
    expect(button).not.toBeNull();
    const classes = button?.className.split(" ").filter(Boolean) ?? [];
    expect(classes).toContain("custom-button-class");
    expect(
      classes.filter((c) => c !== "custom-button-class").length,
    ).toBeGreaterThan(0);
  });

  it("mounts EmptyState and verifies complete DOM composition", async () => {
    await fixture.render(<EmptyState />);

    const title = fixture.container.querySelector("h1");
    const desc = fixture.container.querySelector("p");
    const button = fixture.container.querySelector("button");

    expect(title).not.toBeNull();
    expect(title?.textContent).toBe("No books yet.");
    expect(desc).not.toBeNull();
    expect(desc?.textContent).toBe("Add a book to start reading.");
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe("Add your first book");

    // Verify StyleX class names are applied
    expect(title?.className.length).toBeGreaterThan(0);
    expect(desc?.className.length).toBeGreaterThan(0);
    expect(button?.className.length).toBeGreaterThan(0);
  });

  it("mounts Home page and verifies top-level layout integration", async () => {
    await fixture.render(<Home />);

    const main = fixture.container.querySelector("main");
    expect(main).not.toBeNull();
    expect(main?.className.length).toBeGreaterThan(0);

    const emptyState = main?.firstElementChild;
    expect(emptyState).not.toBeNull();
    expect(emptyState?.querySelector("h1")?.textContent).toBe("No books yet.");
    expect(emptyState?.querySelector("button")?.textContent).toBe(
      "Add your first book",
    );
  });

  it("resolves Google fonts configuration for typography tokens", () => {
    const petit = Petit_Formal_Script({
      weight: "400",
      subsets: ["latin"],
      variable: "--font-petit",
    });
    const cantarell = Cantarell({
      weight: ["400", "700"],
      subsets: ["latin"],
      variable: "--font-cantarell",
    });
    expect(petit.variable).toBe("--font-petit");
    expect(cantarell.variable).toBe("--font-cantarell");
  });

  it("handles interactions on UpdateBanner for reload and dismiss", async () => {
    let reloaded = false;
    let dismissed = false;

    await fixture.render(
      <UpdateBanner
        onReload={() => {
          reloaded = true;
        }}
        onDismiss={() => {
          dismissed = true;
        }}
      />,
    );

    const buttons = fixture.container.querySelectorAll("button");
    expect(buttons.length).toBe(2);

    const dismissButton = Array.from(buttons).find(
      (b) => b.textContent === "Dismiss",
    );
    const reloadButton = Array.from(buttons).find(
      (b) => b.textContent === "Reload",
    );

    expect(dismissButton).toBeDefined();
    expect(reloadButton).toBeDefined();

    dismissButton?.click();
    expect(dismissed).toBe(true);

    reloadButton?.click();
    expect(reloaded).toBe(true);
  });
});
