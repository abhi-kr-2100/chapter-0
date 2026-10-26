"use client";

import { useEffect, useRef, useState } from "react";
import { type ClientSyncChannel, openClientSyncChannel } from "./client-sync";
import { activateWorker, registerServiceWorker } from "./lifecycle";

export type UpdateState =
  | { status: "idle" }
  | { status: "update-available"; worker: ServiceWorker }
  | { status: "dismissed" };

export interface UseServiceWorkerReturn {
  state: UpdateState;
  reload: () => void;
  dismiss: () => void;
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const [state, setState] = useState<UpdateState>({ status: "idle" });
  const syncRef = useRef<ClientSyncChannel>({
    broadcast: () => {},
    close: () => {},
  });

  useEffect(() => {
    const cleanupRegistration = registerServiceWorker((worker) => {
      setState({ status: "update-available", worker });
    });
    const sync = openClientSyncChannel(() => {
      window.location.reload();
    });
    syncRef.current = sync;

    return () => {
      cleanupRegistration();
      sync.close();
    };
  }, []);

  const reload = () => {
    if (state.status === "update-available") {
      activateWorker(state.worker, () => {
        syncRef.current.broadcast();
        window.location.reload();
      });
    }
  };

  const dismiss = () => {
    setState({ status: "dismissed" });
  };

  return { state, reload, dismiss };
}
