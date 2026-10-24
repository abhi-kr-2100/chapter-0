import type React from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";

interface ActiveRoot {
  root: Root;
  container: HTMLElement;
}

const activeRoots: Array<ActiveRoot> = [];

export function cleanup(): void {
  for (const item of activeRoots) {
    flushSync(() => {
      item.root.unmount();
    });
    item.container.remove();
  }
  activeRoots.length = 0;
}

export interface RenderResult<T extends HTMLElement = HTMLElement> {
  container: HTMLElement;
  element: T;
}

export function render<T extends HTMLElement = HTMLElement>(
  ui: React.ReactElement,
): RenderResult<T> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(ui);
  });
  activeRoots.push({ root, container });
  const element = container.firstElementChild;
  if (!element) {
    throw new Error("Expected element to be rendered in container");
  }
  if (!(element instanceof HTMLElement)) {
    throw new Error("Expected element to be an HTMLElement");
  }
  return { container, element: element as T };
}

export interface RenderNullableResult<T extends HTMLElement = HTMLElement> {
  container: HTMLElement;
  element: T | null;
}

export function renderNullable<T extends HTMLElement = HTMLElement>(
  ui: React.ReactElement,
): RenderNullableResult<T> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(ui);
  });
  activeRoots.push({ root, container });
  const element = container.firstElementChild;
  if (element && !(element instanceof HTMLElement)) {
    throw new Error("Expected element to be an HTMLElement");
  }
  return { container, element: (element as T) ?? null };
}
