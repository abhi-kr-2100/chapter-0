import { afterEach, beforeEach } from "bun:test";
import { Window } from "happy-dom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

// Configure React act() environment
(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

export interface DomFixture {
  readonly window: Window;
  readonly container: HTMLElement;
  render(ui: React.ReactNode): Promise<void>;
}

export function setupDomFixture(): DomFixture {
  let window: Window;
  let container: HTMLElement;
  let root: Root;

  const originalGlobals = {
    window: globalThis.window,
    document: globalThis.document,
    Node: globalThis.Node,
    Element: globalThis.Element,
    HTMLElement: globalThis.HTMLElement,
    HTMLButtonElement: globalThis.HTMLButtonElement,
  };

  beforeEach(() => {
    window = new Window();
    globalThis.window = window as unknown as typeof globalThis.window;
    globalThis.document =
      window.document as unknown as typeof globalThis.document;
    globalThis.Node = window.Node as unknown as typeof globalThis.Node;
    globalThis.Element = window.Element as unknown as typeof globalThis.Element;
    globalThis.HTMLElement =
      window.HTMLElement as unknown as typeof globalThis.HTMLElement;
    globalThis.HTMLButtonElement =
      window.HTMLButtonElement as unknown as typeof globalThis.HTMLButtonElement;

    const div = window.document.createElement("div");
    window.document.body.appendChild(div);
    container = div as unknown as HTMLElement;
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    globalThis.window = originalGlobals.window;
    globalThis.document = originalGlobals.document;
    globalThis.Node = originalGlobals.Node;
    globalThis.Element = originalGlobals.Element;
    globalThis.HTMLElement = originalGlobals.HTMLElement;
    globalThis.HTMLButtonElement = originalGlobals.HTMLButtonElement;
  });

  return {
    get window() {
      return window;
    },
    get container() {
      return container;
    },
    async render(ui: React.ReactNode) {
      await act(async () => {
        root.render(ui);
      });
    },
  };
}
