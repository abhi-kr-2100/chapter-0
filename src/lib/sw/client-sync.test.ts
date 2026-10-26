import { describe, expect, it } from "bun:test";
import {
  broadcastClientReload,
  CLIENT_RELOAD_SIGNAL,
  CLIENT_SYNC_CHANNEL_NAME,
  subscribeToClientReload,
} from "./client-sync";

describe("client-sync", () => {
  describe("subscribeToClientReload", () => {
    it("subscribes and triggers callback on CLIENT_RELOAD_SIGNAL broadcast", async () => {
      let reloadCount = 0;
      const unsubscribe = subscribeToClientReload(() => {
        reloadCount += 1;
      });

      const senderChannel = new BroadcastChannel(CLIENT_SYNC_CHANNEL_NAME);
      senderChannel.postMessage(CLIENT_RELOAD_SIGNAL);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(reloadCount).toBe(1);

      unsubscribe();
      senderChannel.postMessage(CLIENT_RELOAD_SIGNAL);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(reloadCount).toBe(1);

      senderChannel.close();
    });

    it("ignores non-matching broadcast messages", async () => {
      let reloadCount = 0;
      const unsubscribe = subscribeToClientReload(() => {
        reloadCount += 1;
      });

      const senderChannel = new BroadcastChannel(CLIENT_SYNC_CHANNEL_NAME);
      senderChannel.postMessage("UNKNOWN_SIGNAL");
      senderChannel.postMessage({ type: "RELOAD_ALL" });
      senderChannel.postMessage(null);
      senderChannel.postMessage(123);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(reloadCount).toBe(0);

      unsubscribe();
      senderChannel.close();
    });

    it("handles environment without BroadcastChannel gracefully", () => {
      const originalBroadcastChannel = globalThis.BroadcastChannel;
      // @ts-expect-error simulating environment without BroadcastChannel
      delete globalThis.BroadcastChannel;

      try {
        const unsubscribe = subscribeToClientReload(() => {});
        expect(typeof unsubscribe).toBe("function");
        expect(() => unsubscribe()).not.toThrow();
      } finally {
        globalThis.BroadcastChannel = originalBroadcastChannel;
      }
    });
  });

  describe("broadcastClientReload", () => {
    it("broadcasts CLIENT_RELOAD_SIGNAL across channel", async () => {
      let receivedMessage: unknown = null;
      const receiverChannel = new BroadcastChannel(CLIENT_SYNC_CHANNEL_NAME);
      receiverChannel.addEventListener("message", (event) => {
        receivedMessage = event.data;
      });

      broadcastClientReload();

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(receivedMessage).toBe(CLIENT_RELOAD_SIGNAL);

      receiverChannel.close();
    });

    it("handles environment without BroadcastChannel gracefully", () => {
      const originalBroadcastChannel = globalThis.BroadcastChannel;
      // @ts-expect-error simulating environment without BroadcastChannel
      delete globalThis.BroadcastChannel;

      try {
        expect(() => broadcastClientReload()).not.toThrow();
      } finally {
        globalThis.BroadcastChannel = originalBroadcastChannel;
      }
    });
  });
});
