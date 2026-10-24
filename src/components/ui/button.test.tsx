import { afterEach, describe, expect, it } from "bun:test";
import type React from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { Button } from "./button";

const activeRoots: Array<{ root: Root; container: HTMLElement }> = [];

function render(ui: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(ui);
  });
  activeRoots.push({ root, container });
  const button = container.querySelector("button");
  if (!button) {
    throw new Error("Expected button element to be rendered in container");
  }
  return { container, button };
}

afterEach(() => {
  while (activeRoots.length > 0) {
    const item = activeRoots.pop();
    if (item) {
      flushSync(() => {
        item.root.unmount();
      });
      item.container.remove();
    }
  }
});

describe("Button", () => {
  it("renders with default props and children", () => {
    const { button } = render(<Button>Click me</Button>);

    expect(button.tagName).toBe("BUTTON");
    expect(button.type).toBe("button");
    expect(button.getAttribute("data-slot")).toBe("button");
    expect(button.textContent).toBe("Click me");
    expect(button.disabled).toBe(false);
    expect(button.className.trim().length).toBeGreaterThan(0);
  });

  it("applies disabled styles and attribute when disabled", () => {
    const { button: defaultButton } = render(<Button>Enabled</Button>);
    const { button: disabledButton } = render(
      <Button disabled>Disabled</Button>,
    );

    expect(disabledButton.disabled).toBe(true);
    expect(disabledButton.className).not.toBe(defaultButton.className);
  });

  it("merges custom className when provided", () => {
    const { button: defaultButton } = render(<Button>Default</Button>);
    const { button } = render(<Button className="custom-class">Custom</Button>);

    expect(button.className).toContain("custom-class");
    expect(button.className).toBe(`${defaultButton.className} custom-class`);
  });

  it("passes through rest attributes and handles click events", () => {
    let clicked = false;
    const { button } = render(
      <Button
        type="submit"
        onClick={() => {
          clicked = true;
        }}
      >
        Submit
      </Button>,
    );

    expect(button.type).toBe("submit");
    button.click();
    expect(clicked).toBe(true);
  });
});
