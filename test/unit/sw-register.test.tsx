import { describe, expect, it } from "bun:test";
import { act } from "react";
import {
  handleUpdateMessage,
  ServiceWorkerRegister,
  triggerReloadAll,
  UPDATE_CHANNEL_NAME,
} from "../../src/app/sw-register";
import { setupDomFixture } from "../fixtures/dom";

class FakeServiceWorker extends EventTarget {
  state: ServiceWorkerState = "installing";
  postedMessages: unknown[] = [];

  postMessage(message: unknown): void {
    this.postedMessages.push(message);
  }
}

class FakeServiceWorkerRegistration extends EventTarget {
  waiting: FakeServiceWorker | null = null;
  installing: FakeServiceWorker | null = null;
}

class FakeServiceWorkerContainer extends EventTarget {
  controller: FakeServiceWorker | null = null;
  registrationToReturn: FakeServiceWorkerRegistration =
    new FakeServiceWorkerRegistration();
  shouldReject = false;
  rejectError = new Error("Registration failed");

  async register(_url: string): Promise<FakeServiceWorkerRegistration> {
    if (this.shouldReject) {
      throw this.rejectError;
    }
    return this.registrationToReturn;
  }
}

describe("sw-register helpers and ServiceWorkerRegister component", () => {
  const fixture = setupDomFixture();

  it("exports correct update channel name", () => {
    expect(UPDATE_CHANNEL_NAME).toBe("chapter0-sw-update");
    expect(fixture.window).toBeDefined();
    expect(fixture.container).toBeDefined();
  });

  describe("handleUpdateMessage", () => {
    it("calls reloadFn and returns true when payload has type RELOAD_ALL", () => {
      let reloaded = false;
      const handled = handleUpdateMessage({ type: "RELOAD_ALL" }, () => {
        reloaded = true;
      });
      expect(handled).toBe(true);
      expect(reloaded).toBe(true);
    });

    it("returns false and does not reload for non-matching payloads", () => {
      let reloaded = false;
      const reloadFn = () => {
        reloaded = true;
      };

      expect(
        handleUpdateMessage(
          { type: "OTHER" as unknown as "RELOAD_ALL" },
          reloadFn,
        ),
      ).toBe(false);
      expect(reloaded).toBe(false);
    });
  });

  describe("triggerReloadAll", () => {
    it("posts RELOAD_ALL to channel, SKIP_WAITING to worker, and reloads", () => {
      const channelMessages: unknown[] = [];
      const workerMessages: unknown[] = [];
      let reloaded = false;

      const mockChannel = {
        postMessage(msg: unknown) {
          channelMessages.push(msg);
        },
      } as unknown as BroadcastChannel;

      const mockWorker = {
        postMessage(msg: unknown) {
          workerMessages.push(msg);
        },
      } as unknown as ServiceWorker;

      triggerReloadAll(mockWorker, mockChannel, () => {
        reloaded = true;
      });

      expect(channelMessages).toEqual([{ type: "RELOAD_ALL" }]);
      expect(workerMessages).toEqual([{ type: "SKIP_WAITING" }]);
      expect(reloaded).toBe(true);
    });
  });

  describe("ServiceWorkerRegister in DOM", () => {
    it("renders nothing when serviceWorker is not supported in navigator", async () => {
      await fixture.render(<ServiceWorkerRegister />);
      expect(fixture.container.innerHTML).toBe("");
    });

    it("renders update banner when waiting worker exists on registration", async () => {
      const swContainer = new FakeServiceWorkerContainer();
      const waitingWorker = new FakeServiceWorker();
      waitingWorker.state = "installed";
      swContainer.registrationToReturn.waiting = waitingWorker;

      Object.defineProperty(globalThis.navigator, "serviceWorker", {
        value: swContainer,
        configurable: true,
      });

      await fixture.render(<ServiceWorkerRegister />);
      // Allow async register promise to resolve and state to update
      await act(async () => {
        await Promise.resolve();
      });

      expect(fixture.container.textContent).toContain("Update available");
      expect(fixture.container.textContent).toContain(
        "Reloading will update all open instances of Chapter 0.",
      );

      // Verify dismissing the banner hides it
      const dismissBtn = Array.from(
        fixture.container.querySelectorAll("button"),
      ).find((b) => b.textContent === "Dismiss");
      expect(dismissBtn).toBeDefined();

      await act(async () => {
        dismissBtn?.click();
      });

      expect(fixture.container.innerHTML).toBe("");
    });

    it("detects updatefound and displays banner when installing worker transitions to installed", async () => {
      const swContainer = new FakeServiceWorkerContainer();
      swContainer.controller = new FakeServiceWorker();
      const reg = swContainer.registrationToReturn;

      Object.defineProperty(globalThis.navigator, "serviceWorker", {
        value: swContainer,
        configurable: true,
      });

      await fixture.render(<ServiceWorkerRegister />);
      await act(async () => {
        await Promise.resolve();
      });
      expect(fixture.container.innerHTML).toBe("");

      // Simulate updatefound with null installing (early return branch)
      reg.installing = null;
      await act(async () => {
        reg.dispatchEvent(new Event("updatefound"));
      });
      expect(fixture.container.innerHTML).toBe("");

      // Simulate updatefound with a real installing worker
      const installingWorker = new FakeServiceWorker();
      reg.installing = installingWorker;
      await act(async () => {
        reg.dispatchEvent(new Event("updatefound"));
      });

      // Simulate statechange when state is not yet installed
      installingWorker.state = "installing";
      await act(async () => {
        installingWorker.dispatchEvent(new Event("statechange"));
      });
      expect(fixture.container.innerHTML).toBe("");

      // Simulate statechange to installed
      installingWorker.state = "installed";
      await act(async () => {
        installingWorker.dispatchEvent(new Event("statechange"));
      });

      expect(fixture.container.textContent).toContain("Update available");

      // Clicking reload triggers postMessage on worker
      const reloadBtn = Array.from(
        fixture.container.querySelectorAll("button"),
      ).find((b) => b.textContent === "Reload");
      expect(reloadBtn).toBeDefined();

      // Intercept window.location.reload
      const originalReload = window.location.reload;
      let reloaded = false;
      Object.defineProperty(window, "location", {
        value: {
          ...window.location,
          reload: () => {
            reloaded = true;
          },
        },
        configurable: true,
      });

      await act(async () => {
        reloadBtn?.click();
      });

      expect(reloaded).toBe(true);
      expect(installingWorker.postedMessages).toEqual([
        { type: "SKIP_WAITING" },
      ]);

      // Restore window.location.reload
      Object.defineProperty(window, "location", {
        value: { ...window.location, reload: originalReload },
        configurable: true,
      });
    });

    it("handles service worker registration errors cleanly", async () => {
      const swContainer = new FakeServiceWorkerContainer();
      swContainer.shouldReject = true;

      const consoleErrors: unknown[] = [];
      const origConsoleError = console.error;
      console.error = (...args: unknown[]) => {
        consoleErrors.push(args);
      };

      Object.defineProperty(globalThis.navigator, "serviceWorker", {
        value: swContainer,
        configurable: true,
      });

      await fixture.render(<ServiceWorkerRegister />);
      await act(async () => {
        await Promise.resolve();
      });

      expect(consoleErrors.length).toBeGreaterThan(0);
      console.error = origConsoleError;
    });

    it("handles broadcast reload messages cleanly across instances", async () => {
      const swContainer = new FakeServiceWorkerContainer();
      Object.defineProperty(globalThis.navigator, "serviceWorker", {
        value: swContainer,
        configurable: true,
      });

      let reloadedCount = 0;
      const originalLocation = window.location;
      Object.defineProperty(window, "location", {
        value: {
          ...originalLocation,
          reload: () => {
            reloadedCount++;
          },
        },
        configurable: true,
      });

      await fixture.render(<ServiceWorkerRegister />);
      await act(async () => {
        await Promise.resolve();
      });

      // Send RELOAD_ALL via BroadcastChannel from another simulated instance
      const externalChannel = new BroadcastChannel(UPDATE_CHANNEL_NAME);
      await act(async () => {
        externalChannel.postMessage({ type: "RELOAD_ALL" });
        await new Promise((r) => setTimeout(r, 20));
      });
      expect(reloadedCount).toBe(1);
      externalChannel.close();

      Object.defineProperty(window, "location", {
        value: originalLocation,
        configurable: true,
      });
    });
  });
});
