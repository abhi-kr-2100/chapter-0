export const CLIENT_SYNC_CHANNEL_NAME = "chapter0-client-sync";
export const CLIENT_RELOAD_SIGNAL = "RELOAD_ALL";

export function subscribeToClientReload(onReload: () => void): () => void {
  if (!("BroadcastChannel" in globalThis)) {
    return () => {};
  }

  const channel = new BroadcastChannel(CLIENT_SYNC_CHANNEL_NAME);
  const handleMessage = (event: MessageEvent<unknown>) => {
    if (event.data === CLIENT_RELOAD_SIGNAL) {
      onReload();
    }
  };

  channel.addEventListener("message", handleMessage);

  return () => {
    channel.removeEventListener("message", handleMessage);
    channel.close();
  };
}

export function broadcastClientReload(): void {
  if (!("BroadcastChannel" in globalThis)) {
    return;
  }

  const channel = new BroadcastChannel(CLIENT_SYNC_CHANNEL_NAME);
  channel.postMessage(CLIENT_RELOAD_SIGNAL);
  channel.close();
}
