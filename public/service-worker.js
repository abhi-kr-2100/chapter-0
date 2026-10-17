import {
	createFailureResponse,
	isCacheableRequest,
	isCacheableResponse,
} from "./sw-cache-rules.js";

// Cache name is dynamically updated with the precache content revision hash during build
const CACHE_NAME = "chapter0-dev";
const PRECACHE_ASSETS = [
	"/",
	"/reader/",
	"/offline.html",
	"/manifest.webmanifest",
	"/favicon.ico",
	"/favicon.svg",
	"/icons/icon.svg",
	"/icons/icon-maskable.svg",
	"/icons/icon-192.png",
	"/icons/icon-512.png",
	"/icons/icon-maskable-512.png",
	"/offline.svg",
	"/sw-cache-rules.js",
];

// 1. Install: Precache shell assets including all MPA pages (/ and /reader/).
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)),
	);
});

// 2. Activate: Clean up old caches when the new worker is activated.
self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key !== CACHE_NAME)
						.map((key) => caches.delete(key)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

// Optional message handler to allow manual skipWaiting triggers if requested by UI
self.addEventListener("message", (event) => {
	if (event.data && event.data.type === "SKIP_WAITING") {
		self.skipWaiting();
	}
});

// 3. Fetch: Stale-While-Revalidate (offline cache first, background fresh call & update)
self.addEventListener("fetch", (event) => {
	if (event.request.method !== "GET") return;
	if (event.request.headers.has("range")) return;

	const url = new URL(event.request.url);
	if (!url.protocol.startsWith("http")) return;

	event.respondWith(
		caches.open(CACHE_NAME).then(async (cache) => {
			const cacheableRequest = isCacheableRequest(event.request, url);

			// Check cache first for cacheable requests
			let cachedResponse = cacheableRequest
				? await cache.match(event.request)
				: undefined;

			// For navigation requests in an MPA: match the requested page shell (/, /reader/, or /offline.html)
			if (
				!cachedResponse &&
				cacheableRequest &&
				(event.request.mode === "navigate" ||
					event.request.destination === "document")
			) {
				const isReaderPath =
					url.pathname === "/reader" || url.pathname.startsWith("/reader/");
				const isOfflinePath =
					url.pathname === "/offline" ||
					url.pathname === "/offline.html" ||
					url.pathname.startsWith("/offline/");
				const isLibraryPath =
					url.pathname === "/" || url.pathname === "/index.html";

				if (isReaderPath) {
					cachedResponse = await cache.match("/reader/");
				} else if (isOfflinePath) {
					cachedResponse = await cache.match("/offline.html");
				} else if (isLibraryPath) {
					cachedResponse = await cache.match("/");
				}
			}

			// Fresh network call dispatched in parallel to revalidate and update the cache
			const fetchPromise = fetch(event.request)
				.then(async (networkResponse) => {
					const isNavigation =
						event.request.mode === "navigate" ||
						event.request.destination === "document";
					const shouldCache =
						!isNavigation ||
						(url.search === "" &&
							(url.pathname === "/" ||
								url.pathname === "/reader/" ||
								url.pathname === "/offline.html"));

					if (
						shouldCache &&
						isCacheableResponse(event.request, networkResponse, url)
					) {
						try {
							await cache.put(event.request, networkResponse.clone());
						} catch {
							// Failures writing to cache (e.g. quota exceeded) should not reject fetchPromise
							// or prevent returning the fresh network response.
						}
					}
					return networkResponse;
				})
				.catch(async () => {
					// If offline / network error and no cached response existed, return specific failure response
					if (!cachedResponse) {
						return createFailureResponse(event.request);
					}
					return undefined;
				});

			// 1. If we have a cached copy: serve it immediately (instant offline load),
			// and keep the worker alive via event.waitUntil until the fresh background call writes to cache.
			if (cachedResponse) {
				event.waitUntil(fetchPromise);
				return cachedResponse;
			}

			// 2. If no cached copy: wait for the fresh network call
			return fetchPromise;
		}),
	);
});
