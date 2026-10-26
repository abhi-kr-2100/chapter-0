import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import type { Browser, BrowserContext } from "playwright-core";
import {
  type BrowserSession,
  createBrowserSession,
  createE2EServer,
  navigateToControlledPage,
  OUT_DIR,
  type StaticServerInstance,
} from "./fixture";

describe("ServiceWorkerRegister (E2E)", () => {
  let serverInstance: StaticServerInstance = {
    baseUrl: "",
    stop: () => {},
  };
  let session: BrowserSession = {
    browser: {} as Browser,
    context: {} as BrowserContext,
    close: async () => {},
  };
  let originalSwCode = "";
  const swPath = path.join(OUT_DIR, "sw.js");

  beforeAll(async () => {
    originalSwCode = await fs.readFile(swPath, "utf8");
    serverInstance = createE2EServer();
  }, 20000);

  afterAll(async () => {
    if (originalSwCode.length > 0) {
      await fs.writeFile(swPath, originalSwCode, "utf8");
    }
    serverInstance.stop();
  });

  beforeEach(async () => {
    session = await createBrowserSession();
  }, 20000);

  afterEach(async () => {
    await session.close();
  });

  it("does not render update banner on clean page load", async () => {
    const page = await session.context.newPage();
    try {
      await page.goto(serverInstance.baseUrl);

      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });

      const initialBannerCount = await page
        .locator("aside[role='status']")
        .count();
      expect(initialBannerCount).toBe(0);

      await page.reload();
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });

      const reloadedBannerCount = await page
        .locator("aside[role='status']")
        .count();
      expect(reloadedBannerCount).toBe(0);
    } finally {
      await page.close();
    }
  }, 15000);

  it("renders update banner when service worker update is installed, and dismisses it on click", async () => {
    const page = await session.context.newPage();
    try {
      await navigateToControlledPage(page, serverInstance.baseUrl);

      await fs.writeFile(
        swPath,
        `${originalSwCode}\n// update-dismiss-test\n`,
        "utf8",
      );

      await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.ready;
        await reg.update();
      });

      const banner = page.locator("aside[role='status']");
      await banner.waitFor({ state: "visible", timeout: 10000 });

      const title = page.locator("#update-banner-title");
      expect(await title.textContent()).toBe("Update available");

      const description = page.locator("#update-banner-desc");
      expect(await description.textContent()).toBe(
        "A new version of Chapter 0 is available. All instances will reload. Please save any unsaved work.",
      );

      const dismissButton = page.locator("button", { hasText: "Dismiss" });
      const updateButton = page.locator("button", { hasText: "Update" });
      expect(await dismissButton.isVisible()).toBe(true);
      expect(await updateButton.isVisible()).toBe(true);

      await dismissButton.click();

      await banner.waitFor({ state: "detached", timeout: 5000 });
      const remainingCount = await banner.count();
      expect(remainingCount).toBe(0);
    } finally {
      await fs.writeFile(swPath, originalSwCode, "utf8");
      await page.close();
    }
  }, 20000);

  it("activates updated service worker and reloads page on update button click", async () => {
    const page = await session.context.newPage();
    try {
      await navigateToControlledPage(page, serverInstance.baseUrl);

      const updatedSwCode = `${originalSwCode}
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0].postMessage("updated");
  }
});
`;

      await fs.writeFile(swPath, updatedSwCode, "utf8");

      await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.ready;
        await reg.update();
      });

      const banner = page.locator("aside[role='status']");
      await banner.waitFor({ state: "visible", timeout: 10000 });

      await page.evaluate(() => {
        const win = window as unknown as {
          __reloadVerificationMarker: boolean;
        };
        win.__reloadVerificationMarker = true;
      });

      const reloadPromise = page.waitForEvent("load");
      const updateButton = page.locator("button", { hasText: "Update" });
      await updateButton.click();

      await reloadPromise;

      const markerPresent = await page.evaluate(() => {
        const win = window as unknown as {
          __reloadVerificationMarker?: boolean;
        };
        return win.__reloadVerificationMarker === true;
      });

      expect(markerPresent).toBe(false);

      const controllerVersion = await page.evaluate(async () => {
        const controller = navigator.serviceWorker.controller;
        if (!controller) {
          throw new Error("Service worker controller is not available");
        }

        return new Promise<string>((resolve) => {
          const messageChannel = new MessageChannel();
          messageChannel.port1.onmessage = (event: MessageEvent<string>) => {
            resolve(event.data);
          };
          controller.postMessage({ type: "GET_VERSION" }, [
            messageChannel.port2,
          ]);
        });
      });

      expect(controllerVersion).toBe("updated");
    } finally {
      await fs.writeFile(swPath, originalSwCode, "utf8");
      await page.close();
    }
  }, 20000);
});
