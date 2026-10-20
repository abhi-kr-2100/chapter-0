import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import RootLayout, { metadata, viewport } from "../../src/app/layout";

describe("RootLayout", () => {
  it("exports valid metadata configuration", () => {
    expect(metadata.title).toBe("Chapter 0");
    expect(metadata.description).toBe("Read books inside your browser");
    expect(metadata.icons).toEqual({
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "any" },
      ],
      apple: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
    });
    expect(metadata.appleWebApp).toEqual({
      capable: true,
      statusBarStyle: "default",
      title: "Chapter 0",
    });
  });

  it("exports valid viewport themeColor configuration", () => {
    expect(viewport.themeColor).toEqual([
      { media: "(prefers-color-scheme: light)", color: "#FBFBF9" },
      { media: "(prefers-color-scheme: dark)", color: "#141312" },
    ]);
  });

  it("renders the root html document structure with fonts and children", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <div id="test-child">Child Content</div>
      </RootLayout>,
    );

    expect(markup).toContain('<html lang="en"');
    expect(markup).toContain("--font-petit");
    expect(markup).toContain("--font-cantarell");
    expect(markup).toContain("<body");
    expect(markup).toContain('id="test-child"');
    expect(markup).toContain("Child Content");
  });
});
