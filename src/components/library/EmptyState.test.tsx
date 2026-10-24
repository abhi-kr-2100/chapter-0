import { describe, expect, it } from "bun:test";
import { render } from "../../../tests/test-utils";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders empty state with heading, description, and call to action button", () => {
    const { container, element } = render<HTMLDivElement>(<EmptyState />);

    expect(element.tagName).toBe("DIV");
    expect(element.className.trim().length).toBeGreaterThan(0);

    const heading = container.querySelector("h1");
    if (!heading) {
      throw new Error("Expected h1 heading to be rendered");
    }
    expect(heading.tagName).toBe("H1");
    expect(heading.textContent).toBe("No books yet.");
    expect(heading.className.trim().length).toBeGreaterThan(0);

    const description = container.querySelector("p");
    if (!description) {
      throw new Error("Expected description paragraph to be rendered");
    }
    expect(description.tagName).toBe("P");
    expect(description.textContent).toBe("Add a book to start reading.");
    expect(description.className.trim().length).toBeGreaterThan(0);

    const button = container.querySelector("button");
    if (!button) {
      throw new Error("Expected button element to be rendered");
    }
    expect(button.tagName).toBe("BUTTON");
    expect(button.textContent).toBe("Add your first book");
    expect(button.type).toBe("button");
    expect(button.className.trim().length).toBeGreaterThan(0);
  });
});
