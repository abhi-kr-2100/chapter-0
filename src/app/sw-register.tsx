"use client";

import { useEffect, useState } from "react";
import { UpdateBanner } from "../components/ui/UpdateBanner";

export const UPDATE_CHANNEL_NAME = "chapter0-sw-update";

export interface UpdateBroadcastMessage {
  type: "RELOAD_ALL";
}

export function handleUpdateMessage(
  message: UpdateBroadcastMessage,
  reloadFn: () => void,
): boolean {
  if (message.type === "RELOAD_ALL") {
    reloadFn();
    return true;
  }
  return false;
}

export function triggerReloadAll(
  worker: ServiceWorker,
  channel: BroadcastChannel,
  reloadFn: () => void,
): void {
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => {
      channel.postMessage({ type: "RELOAD_ALL" });
      reloadFn();
    },
    { once: true },
  );
  worker.postMessage({ type: "SKIP_WAITING" });
}

export type UpdateState =
  | { status: "idle" }
  | { status: "update-available"; worker: ServiceWorker }
  | { status: "dismissed" };

export interface UseServiceWorkerUpdateReturn {
  state: UpdateState;
  reload: () => void;
  dismiss: () => void;
}

export function useServiceWorkerUpdate(): UseServiceWorkerUpdateReturn {
  const [state, setState] = useState<UpdateState>({ status: "idle" });

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("BroadcastChannel" in window)) {
      return;
    }

    let isMounted = true;
    let cleanUpRegistration = () => {};

    const channel = new BroadcastChannel(UPDATE_CHANNEL_NAME);
    const onMessage = (event: MessageEvent<UpdateBroadcastMessage>) => {
      handleUpdateMessage(event.data, () => window.location.reload());
    };
    channel.addEventListener("message", onMessage);

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (!isMounted) {
          return;
        }

        if (registration.waiting) {
          setState({
            status: "update-available",
            worker: registration.waiting,
          });
        }

        const onUpdateFound = () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            if (
              isMounted &&
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setState({
                status: "update-available",
                worker: installing,
              });
            }
          });
        };

        registration.addEventListener("updatefound", onUpdateFound);
        cleanUpRegistration = () => {
          registration.removeEventListener("updatefound", onUpdateFound);
        };
      })
      .catch((error: unknown) => {
        console.error("Service worker registration failed:", error);
      });

    return () => {
      isMounted = false;
      cleanUpRegistration();
      channel.removeEventListener("message", onMessage);
      channel.close();
    };
  }, []);

  const reload = () => {
    if (state.status === "update-available") {
      const channel = new BroadcastChannel(UPDATE_CHANNEL_NAME);
      triggerReloadAll(state.worker, channel, () => window.location.reload());
    }
  };

  const dismiss = () => {
    setState({ status: "dismissed" });
  };

  return { state, reload, dismiss };
}

export function ServiceWorkerRegister() {
  const { state, reload, dismiss } = useServiceWorkerUpdate();

  if (state.status === "update-available") {
    return <UpdateBanner onReload={reload} onDismiss={dismiss} />;
  }

  return null;
}
