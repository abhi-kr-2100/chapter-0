"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    return registerServiceWorker((worker) => {
      setState({ status: "update-available", worker });
    });
  }, []);

  const reload = () => {
    if (state.status === "update-available") {
      activateWorker(state.worker, () => {
        window.location.reload();
      });
    }
  };

  const dismiss = () => {
    setState({ status: "dismissed" });
  };

  return { state, reload, dismiss };
}
