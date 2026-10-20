import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "../../src/app/page";

describe("Home Page", () => {
  it("renders the main container with the EmptyState component", () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain("<main");
    expect(html).toContain("No books yet.");
    expect(html).toContain("Add your first book");
  });
});
