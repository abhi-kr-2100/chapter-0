import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { UpdateBanner } from "../../src/components/ui/UpdateBanner";

describe("UpdateBanner", () => {
  it("renders with reload button and without dismiss button when onDismiss is omitted", () => {
    const html = renderToStaticMarkup(<UpdateBanner onReload={() => {}} />);
    expect(html).toContain("Update available");
    expect(html).toContain(
      "A new version of Chapter 0 is available. Reloading will update all open instances of Chapter 0.",
    );
    expect(html).toContain("Reload");
    expect(html).not.toContain("Dismiss");
  });

  it("renders both reload and dismiss buttons when onDismiss is provided", () => {
    const html = renderToStaticMarkup(
      <UpdateBanner onReload={() => {}} onDismiss={() => {}} />,
    );
    expect(html).toContain("Update available");
    expect(html).toContain("Reload");
    expect(html).toContain("Dismiss");
  });
});
