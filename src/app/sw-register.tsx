"use client";

import { UpdateBanner } from "../components/ui/UpdateBanner";
import { useServiceWorker } from "../lib/sw/use-service-worker";

export function ServiceWorkerRegister() {
  const { state, reload, dismiss } = useServiceWorker();

  if (state.status === "update-available") {
    return <UpdateBanner onReload={reload} onDismiss={dismiss} />;
  }

  return null;
}
