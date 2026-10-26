export function registerServiceWorker(
  onUpdateAvailable: (worker: ServiceWorker) => void,
): () => void {
  if (!("serviceWorker" in navigator)) {
    return () => {};
  }

  const controller = new AbortController();
  const signal = controller.signal;

  navigator.serviceWorker
    .register("/sw.js")
    .then((registration) => {
      if (signal.aborted) {
        return;
      }

      if (registration.waiting) {
        onUpdateAvailable(registration.waiting);
      }

      registration.addEventListener(
        "updatefound",
        () => {
          const installing = registration.installing;
          if (!installing) {
            return;
          }

          installing.addEventListener(
            "statechange",
            () => {
              if (
                !signal.aborted &&
                installing.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                onUpdateAvailable(installing);
              }
            },
            { signal },
          );
        },
        { signal },
      );
    })
    .catch((error: unknown) => {
      console.error("Service worker registration failed:", error);
    });

  return () => {
    controller.abort();
  };
}

export function activateWorker(
  worker: ServiceWorker,
  onActivated: () => void,
): void {
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => {
      onActivated();
    },
    { once: true },
  );
  worker.postMessage({ type: "SKIP_WAITING" });
}
