import { describe, expect, it } from "bun:test";
import { render } from "../../../tests/test-utils";
import { UpdateBanner } from "./UpdateBanner";

describe("UpdateBanner", () => {
  it("renders status banner with title, description, and both buttons when onDismiss is provided", () => {
    const { container, element: aside } = render(
      <UpdateBanner onReload={() => {}} onDismiss={() => {}} />,
    );

    expect(aside.tagName).toBe("ASIDE");
    expect(aside.getAttribute("role")).toBe("status");
    expect(aside.getAttribute("aria-labelledby")).toBe("update-banner-title");
    expect(aside.getAttribute("aria-describedby")).toBe("update-banner-desc");
    expect(aside.className.trim().length).toBeGreaterThan(0);

    const title = container.querySelector("#update-banner-title");
    if (!title) {
      throw new Error("Expected title element to be rendered in container");
    }
    expect(title.tagName).toBe("H2");
    expect(title.textContent).toBe("Update available");
    expect(title.className.trim().length).toBeGreaterThan(0);

    const header = title.parentElement;
    if (!header) {
      throw new Error("Expected header element to be present");
    }
    expect(header.tagName).toBe("DIV");
    expect(header.className.trim().length).toBeGreaterThan(0);

    const description = container.querySelector("#update-banner-desc");
    if (!description) {
      throw new Error(
        "Expected description element to be rendered in container",
      );
    }
    expect(description.tagName).toBe("P");
    expect(description.textContent).toBe(
      "A new version of Chapter 0 is available. Reloading will update all open instances of Chapter 0.",
    );
    expect(description.className.trim().length).toBeGreaterThan(0);

    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons.length).toBe(2);

    const [dismissButton, reloadButton] = buttons;
    expect(dismissButton.textContent).toBe("Dismiss");
    expect(dismissButton.type).toBe("button");
    expect(reloadButton.textContent).toBe("Reload");
    expect(reloadButton.type).toBe("button");

    const actions = dismissButton.parentElement;
    if (!actions) {
      throw new Error("Expected actions element to be present");
    }
    expect(actions.tagName).toBe("DIV");
    expect(actions.className.trim().length).toBeGreaterThan(0);
  });

  it("renders only the reload button when onDismiss is omitted", () => {
    const { container } = render(<UpdateBanner onReload={() => {}} />);

    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons.length).toBe(1);

    const [reloadButton] = buttons;
    expect(reloadButton.textContent).toBe("Reload");
    expect(reloadButton.type).toBe("button");

    const hasDismissButton = buttons.some(
      (button) => button.textContent === "Dismiss",
    );
    expect(hasDismissButton).toBe(false);
  });

  it("invokes callbacks on button clicks", () => {
    let reloadCount = 0;
    let dismissCount = 0;

    const { container } = render(
      <UpdateBanner
        onReload={() => {
          reloadCount += 1;
        }}
        onDismiss={() => {
          dismissCount += 1;
        }}
      />,
    );

    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons.length).toBe(2);

    const [dismissButton, reloadButton] = buttons;

    dismissButton.click();
    expect(dismissCount).toBe(1);
    expect(reloadCount).toBe(0);

    reloadButton.click();
    expect(dismissCount).toBe(1);
    expect(reloadCount).toBe(1);
  });
});
