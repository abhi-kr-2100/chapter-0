export function registerServiceWorker(): void {
	if (!("serviceWorker" in navigator)) {
		return;
	}

	const register = () => {
		navigator.serviceWorker
			.register("/service-worker.js", { type: "module" })
			.catch((err) => {
				console.error("Service worker registration failed:", err);
			});
	};

	if (document.readyState === "complete") {
		register();
	} else {
		window.addEventListener("load", register);
	}
}
