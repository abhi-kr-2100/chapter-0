import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderNullable } from "../../tests/test-utils";
import { ServiceWorkerRegister } from "./sw-register";

describe("ServiceWorkerRegister (unit)", () => {
  it("renders null in standard DOM environment without service worker update", () => {
    const { container, element } = renderNullable(<ServiceWorkerRegister />);

    expect(element).toBeNull();
    expect(container.firstElementChild).toBeNull();
  });

  it("renders empty string during static server-side markup generation", () => {
    const markup = renderToStaticMarkup(<ServiceWorkerRegister />);

    expect(markup).toBe("");
  });
});
