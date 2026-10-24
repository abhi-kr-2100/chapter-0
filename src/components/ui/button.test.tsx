import { describe, expect, it } from "bun:test";
import { render } from "../../../tests/test-utils";
import { Button } from "./button";

describe("Button", () => {
  it("renders with default props and children", () => {
    const { element: button } = render<HTMLButtonElement>(
      <Button>Click me</Button>,
    );

    expect(button.tagName).toBe("BUTTON");
    expect(button.type).toBe("button");
    expect(button.getAttribute("data-slot")).toBe("button");
    expect(button.textContent).toBe("Click me");
    expect(button.disabled).toBe(false);
    expect(button.className.trim().length).toBeGreaterThan(0);
  });

  it("applies disabled styles and attribute when disabled", () => {
    const { element: defaultButton } = render<HTMLButtonElement>(
      <Button>Enabled</Button>,
    );
    const { element: disabledButton } = render<HTMLButtonElement>(
      <Button disabled>Disabled</Button>,
    );

    expect(disabledButton.disabled).toBe(true);
    expect(defaultButton.disabled).toBe(false);

    const defaultClasses = Array.from(defaultButton.classList);
    const disabledClasses = Array.from(disabledButton.classList);

    const addedClasses = disabledClasses.filter(
      (cls) => !defaultClasses.includes(cls),
    );
    const removedClasses = defaultClasses.filter(
      (cls) => !disabledClasses.includes(cls),
    );

    expect(addedClasses.length).toBeGreaterThan(0);
    expect(removedClasses.length).toBe(0);
  });

  it("merges custom className when provided", () => {
    const { element: defaultButton } = render<HTMLButtonElement>(
      <Button>Default</Button>,
    );
    const { element: button } = render<HTMLButtonElement>(
      <Button className="custom-class">Custom</Button>,
    );

    expect(button.className).toContain("custom-class");
    expect(button.className).toBe(`${defaultButton.className} custom-class`);
  });

  it("passes through rest attributes and handles click events", () => {
    let clicked = false;
    const { element: button } = render<HTMLButtonElement>(
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
