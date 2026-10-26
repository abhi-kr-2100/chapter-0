import { describe, expect, it } from "bun:test";
import {
  CLIENT_RELOAD_SIGNAL,
  CLIENT_SYNC_CHANNEL_NAME,
  openClientSyncChannel,
} from "./client-sync";

describe("client-sync", () => {
  it("exports expected channel name and reload signal constants", () => {
    expect(CLIENT_SYNC_CHANNEL_NAME).toBe("chapter0-client-sync");
    expect(CLIENT_RELOAD_SIGNAL).toBe("RELOAD_ALL");
  });

  describe("openClientSyncChannel", () => {
    it("broadcasts to other clients without delivering to sender", async () => {
      let clientAReloadCount = 0;
      let clientBReloadCount = 0;
      const { promise: clientBReceived, resolve: resolveClientB } =
        Promise.withResolvers<void>();

      const clientA = openClientSyncChannel(() => {
        clientAReloadCount += 1;
      });
      const clientB = openClientSyncChannel(() => {
        clientBReloadCount += 1;
        resolveClientB();
      });

      clientA.broadcast();

      await clientBReceived;

      expect(clientAReloadCount).toBe(0);
      expect(clientBReloadCount).toBe(1);

      clientA.close();
      clientB.close();
    });

    it("stops receiving broadcasts after closing", async () => {
      let clientBReloadCount = 0;
      const { promise: probeReceived, resolve: resolveProbe } =
        Promise.withResolvers<void>();

      const clientA = openClientSyncChannel(() => {});
      const clientB = openClientSyncChannel(() => {
        clientBReloadCount += 1;
      });
      const probe = openClientSyncChannel(() => {
        resolveProbe();
      });

      clientB.close();
      expect(() => clientB.broadcast()).toThrow();
      clientA.broadcast();

      await probeReceived;

      expect(clientBReloadCount).toBe(0);

      clientA.close();
      probe.close();
    });

    it("ignores non-matching broadcast messages", async () => {
      let reloadCount = 0;
      const { promise: probeReceived, resolve: resolveProbe } =
        Promise.withResolvers<void>();

      const client = openClientSyncChannel(() => {
        reloadCount += 1;
      });

      const foreignChannel = new BroadcastChannel(CLIENT_SYNC_CHANNEL_NAME);
      const probeChannel = new BroadcastChannel(CLIENT_SYNC_CHANNEL_NAME);
      probeChannel.addEventListener("message", (event) => {
        if (event.data === "PROBE_SYNC") {
          resolveProbe();
        }
      });

      foreignChannel.postMessage("UNKNOWN_SIGNAL");
      foreignChannel.postMessage({ type: CLIENT_RELOAD_SIGNAL });
      foreignChannel.postMessage(null);
      foreignChannel.postMessage(123);
      foreignChannel.postMessage("PROBE_SYNC");

      await probeReceived;

      expect(reloadCount).toBe(0);

      client.close();
      foreignChannel.close();
      probeChannel.close();
    });

    it("handles environment without BroadcastChannel gracefully", () => {
      const originalBroadcastChannel = globalThis.BroadcastChannel;
      // @ts-expect-error simulating environment without BroadcastChannel
      delete globalThis.BroadcastChannel;

      try {
        const sync = openClientSyncChannel(() => {});
        expect(typeof sync.broadcast).toBe("function");
        expect(typeof sync.close).toBe("function");
        expect(() => sync.broadcast()).not.toThrow();
        expect(() => sync.close()).not.toThrow();
      } finally {
        globalThis.BroadcastChannel = originalBroadcastChannel;
      }
    });
  });
});
