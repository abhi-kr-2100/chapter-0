import { describe, expect, it } from "bun:test";
import getManifest from "../../src/app/manifest";
import { setupE2EFixture } from "../fixtures/e2e";

describe("PWA Installability & Offline Functionality (E2E)", () => {
  const fixture = setupE2EFixture({
    persistent: true,
    initialNavigation: true,
  });

  it("satisfies all Chromium PWA installability criteria with zero errors", async () => {
    const { context, page } = fixture;
    await page.evaluate(() => navigator.serviceWorker.ready);
    const client = await context.newCDPSession(page);
    const { installabilityErrors } = await client.send(
      "Page.getInstallabilityErrors",
    );
    expect(installabilityErrors).toEqual([]);
  });

  it("successfully installs, inspects OS registration, launches, and uninstalls the PWA via CDP", async () => {
    const { context, page, baseUrl } = fixture;
    const client = await context.newCDPSession(page);
    const { appId } = (await client.send("Page.getAppId")) as {
      appId: string;
      recommendedId?: string;
    };
    expect(appId).toBe(`${baseUrl}/`);

    // Try installing the PWA into Chromium
    await client.send("PWA.install", { manifestId: appId });

    try {
      // Verify OS-level application registration state after installation
      const osAppState = (await client.send("PWA.getOsAppState", {
        manifestId: appId,
      })) as {
        badgeCount: number;
        fileHandlers: unknown[];
      };
      expect(osAppState).toBeDefined();
      expect(typeof osAppState.badgeCount).toBe("number");
      expect(Array.isArray(osAppState.fileHandlers)).toBe(true);

      // Launch the installed PWA into a dedicated application window
      const pwaPagePromise = context.waitForEvent("page");
      const launchResult = (await client.send("PWA.launch", {
        manifestId: appId,
      })) as { targetId?: string };
      expect(launchResult.targetId).toBeDefined();

      const pwaPage = await pwaPagePromise;
      try {
        await pwaPage.waitForLoadState("domcontentloaded");
        expect(await pwaPage.title()).toBe("Chapter 0");
      } finally {
        await pwaPage.close();
      }
    } finally {
      // Clean up by uninstalling the PWA and verifying removal via CDP
      // Note: In Chromium CDP (tot / pinned via flake.lock Nixpkgs), getOsAppState rejects with an error
      // when invoked with an uninstalled manifestId.
      await client.send("PWA.uninstall", { manifestId: appId });
    }

    await expect(
      client.send("PWA.getOsAppState", { manifestId: appId }),
    ).rejects.toThrow();
  });

  it("serves a valid Web App Manifest over HTTP matching PWA specifications", async () => {
    const { baseUrl } = fixture;
    const manifestResponse = await fetch(`${baseUrl}/manifest.webmanifest`);
    expect(manifestResponse.status).toBe(200);

    const contentType = manifestResponse.headers.get("content-type");
    expect(contentType).toContain("application/manifest+json");

    const manifest = (await manifestResponse.json()) as {
      name: string;
      short_name: string;
      start_url: string;
      display: string;
      background_color: string;
      theme_color: string;
      icons: Array<{
        src: string;
        sizes: string;
        type: string;
        purpose?: string;
      }>;
    };

    const expected = getManifest();
    expect(expected.name).toBe("Chapter 0");
    expect(manifest.name).toBe("Chapter 0");
    expect(manifest.short_name).toBe("Chapter 0");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.background_color).toBe("#FBFBF9");
    expect(manifest.theme_color).toBe("#FBFBF9");
    expect(manifest.icons.length).toBeGreaterThanOrEqual(4);
  });

  it("serves all manifest icons over HTTP with valid image responses", async () => {
    const { baseUrl } = fixture;
    const manifestResponse = await fetch(`${baseUrl}/manifest.webmanifest`);
    const manifest = (await manifestResponse.json()) as {
      icons: Array<{ src: string; type: string }>;
    };

    for (const icon of manifest.icons) {
      const iconUrl = new URL(icon.src, baseUrl).toString();
      const res = await fetch(iconUrl);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain(icon.type);
      const arrayBuffer = await res.arrayBuffer();
      expect(arrayBuffer.byteLength).toBeGreaterThan(0);
    }
  });

  it("includes mobile and Apple PWA metadata in the rendered document head", async () => {
    const { page } = fixture;
    const metadata = await page.evaluate(() => {
      const manifestLink = document.head.querySelector('link[rel="manifest"]');
      const mobileCapable = document.querySelector(
        'meta[name="mobile-web-app-capable"]',
      );
      const appleTitle = document.querySelector(
        'meta[name="apple-mobile-web-app-title"]',
      );
      const appleStatusBar = document.querySelector(
        'meta[name="apple-mobile-web-app-status-bar-style"]',
      );
      const appleTouchIcon = document.querySelector(
        'link[rel="apple-touch-icon"]',
      );

      return {
        manifestHref: manifestLink?.getAttribute("href"),
        mobileCapable: mobileCapable?.getAttribute("content"),
        appleTitle: appleTitle?.getAttribute("content"),
        appleStatusBar: appleStatusBar?.getAttribute("content"),
        appleTouchIconHref: appleTouchIcon?.getAttribute("href"),
      };
    });

    expect(metadata.manifestHref).toBe("/manifest.webmanifest");
    expect(metadata.mobileCapable).toBe("yes");
    expect(metadata.appleTitle).toBe("Chapter 0");
    expect(metadata.appleStatusBar).toBe("default");
    expect(metadata.appleTouchIconHref).toBe("/icons/icon-192.png");
  });

  it("registers the service worker successfully with root scope", async () => {
    const { page, baseUrl } = fixture;
    const registration = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return null;
      const reg = await navigator.serviceWorker.ready;
      return {
        scope: reg.scope,
        scriptURL: reg.active?.scriptURL,
        hasActive: !!reg.active,
      };
    });

    expect(registration).not.toBeNull();
    expect(registration?.scope).toBe(`${baseUrl}/`);
    expect(registration?.scriptURL).toBe(`${baseUrl}/sw.js`);
    expect(registration?.hasActive).toBe(true);
  });

  it("handles offline transitions and maintains interactive functionality without network", async () => {
    const { context, page } = fixture;
    await page.evaluate(() => {
      const events: string[] = [];
      window.addEventListener("offline", () => events.push("offline"));
      window.addEventListener("online", () => events.push("online"));
      (
        window as unknown as { __connectivityEvents: string[] }
      ).__connectivityEvents = events;
    });

    // 1. Simulate network disconnect
    await context.setOffline(true);
    await page.waitForFunction(() => {
      const events = (window as unknown as { __connectivityEvents?: string[] })
        .__connectivityEvents;
      return !navigator.onLine && events?.includes("offline");
    });

    const offlineStatus = await page.evaluate(() => {
      const events = (window as unknown as { __connectivityEvents: string[] })
        .__connectivityEvents;
      return {
        onLine: navigator.onLine,
        receivedOfflineEvent: events.includes("offline"),
      };
    });

    expect(offlineStatus.onLine).toBe(false);
    expect(offlineStatus.receivedOfflineEvent).toBe(true);

    // 2. Verify UI interaction while completely offline
    const button = page.locator("button");
    await expect(button.isVisible()).resolves.toBe(true);
    await button.hover();
    await button.click();

    // Verify application state and responsiveness remain intact
    const isButtonAccessible = await page.evaluate(() => {
      const active = document.activeElement;
      return active?.tagName === "BUTTON";
    });
    expect(isButtonAccessible).toBe(true);

    // 3. Restore network connectivity
    await context.setOffline(false);
    await page.waitForFunction(() => {
      const events = (window as unknown as { __connectivityEvents?: string[] })
        .__connectivityEvents;
      return navigator.onLine && events?.includes("online");
    });

    const onlineStatus = await page.evaluate(() => {
      const events = (window as unknown as { __connectivityEvents: string[] })
        .__connectivityEvents;
      return {
        onLine: navigator.onLine,
        receivedOnlineEvent: events.includes("online"),
      };
    });

    expect(onlineStatus.onLine).toBe(true);
    expect(onlineStatus.receivedOnlineEvent).toBe(true);
  });

  it("reloads the page after going offline and verifies the service worker serves it", async () => {
    const { context, page } = fixture;
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);

    // 1. Simulate network disconnect
    await context.setOffline(true);
    try {
      // 2. Reload the page while offline and verify service worker delivery
      const response = await page.reload();
      expect(response?.status()).toBe(200);

      // Verify application content loads and is interactive
      const heading = page.locator("h1");
      await expect(heading.isVisible()).resolves.toBe(true);
      expect(await heading.textContent()).toBe("No books yet.");

      const button = page.locator("button");
      await expect(button.isVisible()).resolves.toBe(true);
      expect(await button.textContent()).toBe("Add your first book");
    } finally {
      // 3. Restore network connectivity
      await context.setOffline(false);
      await page.waitForFunction(() => navigator.onLine);
    }
  });

  it("serves cached page offline even when navigation includes query parameters", async () => {
    const { context, page, baseUrl } = fixture;
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);

    await context.setOffline(true);
    try {
      const response = await page.goto(
        `${baseUrl}/?source=pwa&utm_medium=offline`,
      );
      expect(response?.status()).toBe(200);

      const heading = page.locator("h1");
      await expect(heading.isVisible()).resolves.toBe(true);
      expect(await heading.textContent()).toBe("No books yet.");
    } finally {
      await context.setOffline(false);
      await page.waitForFunction(() => navigator.onLine);
    }
  });

  it("serves not-found fallback page offline when navigating to an uncached route", async () => {
    const { context, page, baseUrl } = fixture;
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);

    await context.setOffline(true);
    try {
      const response = await page.goto(`${baseUrl}/non-existent-route-404`);
      expect(response?.status()).toBe(200);

      const bodyText = await page.textContent("body");
      expect(bodyText).toContain("404");
      expect(bodyText).toContain("This page could not be found");
    } finally {
      await context.setOffline(false);
      await page.waitForFunction(() => navigator.onLine);
      await page.goto(baseUrl);
    }
  });

  it("broadcasts reload across multiple open instances on update and reloads all tabs", async () => {
    const { page, baseUrl } = fixture;
    const tab2 = await fixture.context.newPage();
    try {
      await tab2.goto(baseUrl);
      await tab2.evaluate(() => navigator.serviceWorker.ready);

      // Mark tab2 DOM to detect reload
      await tab2.evaluate(() => {
        (
          window as unknown as { __initialInstance: boolean }
        ).__initialInstance = true;
      });

      // Set up listener for tab2 reload
      const tab2ReloadedPromise = tab2.waitForEvent("load");

      // From page (tab 1), trigger the multi-instance reload command
      await page.evaluate(() => {
        const channel = new BroadcastChannel("chapter0-sw-update");
        channel.postMessage({ type: "RELOAD_ALL" });
      });

      // Wait for tab2 to reload completely
      await tab2ReloadedPromise;

      const initialInstanceOnTab2 = await tab2.evaluate(() => {
        return (window as unknown as { __initialInstance?: boolean })
          .__initialInstance;
      });
      expect(initialInstanceOnTab2).toBeUndefined();

      // Ensure tab2 content is re-rendered correctly
      const heading = tab2.locator("h1");
      await expect(heading.isVisible()).resolves.toBe(true);
      expect(await heading.textContent()).toBe("No books yet.");
    } finally {
      await tab2.close();
    }
  }, 15000);
});
