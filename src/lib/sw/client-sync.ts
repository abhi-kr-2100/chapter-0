export const CLIENT_SYNC_CHANNEL_NAME = "chapter0-client-sync";
export const CLIENT_RELOAD_SIGNAL = "RELOAD_ALL";

export interface ClientSyncChannel {
  broadcast: () => void;
  close: () => void;
}

export function openClientSyncChannel(onReload: () => void): ClientSyncChannel {
  if (!("BroadcastChannel" in globalThis)) {
    return {
      broadcast: () => {},
      close: () => {},
    };
  }

  const channel = new BroadcastChannel(CLIENT_SYNC_CHANNEL_NAME);
  const handleMessage = (event: MessageEvent<unknown>) => {
    if (event.data === CLIENT_RELOAD_SIGNAL) {
      onReload();
    }
  };

  channel.addEventListener("message", handleMessage);

  return {
    broadcast: () => {
      channel.postMessage(CLIENT_RELOAD_SIGNAL);
    },
    close: () => {
      channel.close();
    },
  };
}
