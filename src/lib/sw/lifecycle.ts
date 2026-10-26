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
            { signal, once: true },
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
  // If the worker has already activated, run callback immediately.
  if (worker.state === "activated") {
    onActivated();
    return;
  }

  // If the worker has failed or was superseded, do not attempt activation.
  if (worker.state === "redundant") {
    return;
  }

  const handleStateChange = () => {
    if (worker.state === "activated") {
      worker.removeEventListener("statechange", handleStateChange);
      onActivated();
    } else if (worker.state === "redundant") {
      // Worker failed or was superseded; clean up listener.
      worker.removeEventListener("statechange", handleStateChange);
    }
  };

  // Listen before posting to avoid missing the state transition.
  worker.addEventListener("statechange", handleStateChange);
  worker.postMessage({ type: "SKIP_WAITING" });
}
