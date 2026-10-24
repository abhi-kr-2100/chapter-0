import { describe, expect, it } from "bun:test";
import { render } from "../../tests/test-utils";
import Home from "./page";

describe("Home page", () => {
  it("renders main container with empty state", () => {
    const { element: main } = render<HTMLElement>(<Home />);

    expect(main.tagName).toBe("MAIN");
    expect(main.className.trim().length).toBeGreaterThan(0);

    const heading = main.querySelector("h1");
    if (!heading) {
      throw new Error("Expected h1 heading to be rendered");
    }
    expect(heading.tagName).toBe("H1");
    expect(heading.textContent).toBe("No books yet.");

    const description = main.querySelector("p");
    if (!description) {
      throw new Error("Expected description paragraph to be rendered");
    }
    expect(description.tagName).toBe("P");
    expect(description.textContent).toBe("Add a book to start reading.");

    const button = main.querySelector("button");
    if (!button) {
      throw new Error("Expected button element to be rendered");
    }
    expect(button.tagName).toBe("BUTTON");
    expect(button.textContent).toBe("Add your first book");
  });
});
