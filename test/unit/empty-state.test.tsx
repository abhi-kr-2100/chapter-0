import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EmptyState } from "../../src/components/library/EmptyState";

describe("EmptyState", () => {
  it("renders the empty state heading, description, and action button", () => {
    const html = renderToStaticMarkup(<EmptyState />);
    expect(html).toContain("No books yet.");
    expect(html).toContain("Add a book to start reading.");
    expect(html).toContain("Add your first book");
    expect(html).toContain('data-slot="button"');
  });
});
