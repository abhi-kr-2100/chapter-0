import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import {
  type BrowserSession,
  createBrowserSession,
  createE2EServer,
  OUT_DIR,
  type StaticServerInstance,
} from "./fixture";

describe("ServiceWorkerRegister (E2E)", () => {
  let serverInstance: StaticServerInstance;
  let session: BrowserSession;
  let originalSwCode = "";
  const swPath = path.join(OUT_DIR, "sw.js");

  beforeAll(async () => {
    originalSwCode = await fs.readFile(swPath, "utf8");
    serverInstance = createE2EServer();
    session = await createBrowserSession();
  }, 20000);

  afterAll(async () => {
    await fs.writeFile(swPath, originalSwCode, "utf8");
    await session.close();
    serverInstance.stop();
  });

  it("does not render update banner on clean page load", async () => {
    const page = await session.context.newPage();
    try {
      await page.goto(serverInstance.baseUrl);

      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) {
          await new Promise<void>((resolve) => {
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              () => resolve(),
              { once: true },
            );
          });
        }
      });

      const bannerCount = await page.locator("aside[role='status']").count();
      expect(bannerCount).toBe(0);
    } finally {
      await page.close();
    }
  }, 15000);

  it("renders update banner when service worker update is installed, and dismisses it on click", async () => {
    const page = await session.context.newPage();
    try {
      await page.goto(serverInstance.baseUrl);

      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) {
          await new Promise<void>((resolve) => {
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              () => resolve(),
              { once: true },
            );
          });
        }
      });

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
        "A new version of Chapter 0 is available.",
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
      await page.goto(serverInstance.baseUrl);

      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) {
          await new Promise<void>((resolve) => {
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              () => resolve(),
              { once: true },
            );
          });
        }
      });

      await fs.writeFile(
        swPath,
        `${originalSwCode}\n// update-reload-test\n`,
        "utf8",
      );

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
    } finally {
      await fs.writeFile(swPath, originalSwCode, "utf8");
      await page.close();
    }
  }, 20000);
});
