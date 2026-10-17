// Helpers to determine whether a request or response is cacheable.
// Excludes API endpoints, credentialed requests, responses with 'no-store' or 'private' directives,
// and 'Vary: *' responses to avoid persisting sensitive session data or serving stale dynamic bodies.

export function isApiRequest(request, url) {
	const acceptHeader = request.headers.get("Accept") ?? "";
	return (
		url.pathname.startsWith("/api/") ||
		acceptHeader.includes("application/json") ||
		acceptHeader.includes("application/problem+json")
	);
}

export function isCredentialedRequest(request) {
	return (
		request.headers.has("Authorization") ||
		request.headers.has("Authentication")
	);
}

export function hasNoStoreOrPrivate(headers) {
	const cacheControl = headers.get("Cache-Control");
	if (!cacheControl) return false;
	const directives = cacheControl
		.toLowerCase()
		.split(",")
		.map((d) => d.trim().split("=")[0]);
	return directives.includes("no-store") || directives.includes("private");
}

export function isApiResponse(response) {
	const contentType = response?.headers?.get("Content-Type") ?? "";
	return (
		contentType.includes("application/json") ||
		contentType.includes("application/problem+json")
	);
}

export function hasVaryStar(headers) {
	const vary = headers.get("Vary");
	return vary ? vary.includes("*") : false;
}

export function isCacheableRequest(request, url) {
	if (isApiRequest(request, url)) return false;
	if (isCredentialedRequest(request)) return false;
	if (hasNoStoreOrPrivate(request.headers)) return false;
	return true;
}

export function isCacheableResponse(request, response, url) {
	if (!isCacheableRequest(request, url)) return false;
	if (response?.status !== 200) return false;
	if (response?.redirected) return false;
	if (
		response.type !== "basic" &&
		response.type !== "cors" &&
		response.type !== "default"
	) {
		return false;
	}
	if (isApiResponse(response)) return false;
	if (hasNoStoreOrPrivate(response.headers)) return false;
	if (hasVaryStar(response.headers)) return false;
	return true;
}

// Helper to generate type-specific failure responses when network and cache both fail
export async function createFailureResponse(request) {
	const url = new URL(request.url);
	const destination = request.destination;

	// 1. Navigation requests: return pre-cached /offline.html
	if (request.mode === "navigate" || destination === "document") {
		const offlinePage =
			typeof caches !== "undefined"
				? await caches.match("/offline.html")
				: undefined;
		if (offlinePage) {
			return offlinePage;
		}

		return new Response("Offline: Page unavailable", {
			status: 503,
			statusText: "Service Unavailable",
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	}

	// 2. API calls: return JSON error response
	if (isApiRequest(request, url)) {
		return new Response(
			JSON.stringify({
				error: "Service Unavailable",
				message: "Network request failed and no offline cache is available.",
				status: 503,
			}),
			{
				status: 503,
				statusText: "Service Unavailable",
				headers: {
					"Content-Type": "application/json; charset=utf-8",
					"Cache-Control": "no-store",
				},
			},
		);
	}

	// 3. Images: return pre-cached /offline.svg
	if (
		destination === "image" ||
		/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname)
	) {
		const offlineImg =
			typeof caches !== "undefined"
				? await caches.match("/offline.svg")
				: undefined;
		if (offlineImg) {
			return offlineImg;
		}
		return new Response(null, {
			status: 503,
			statusText: "Service Unavailable",
		});
	}

	// 4. Scripts: return JavaScript error with proper content-type
	if (
		destination === "script" ||
		destination === "worker" ||
		/\.m?js$/i.test(url.pathname)
	) {
		return new Response(
			'/* Service Worker: Offline - script unavailable */\nconsole.warn("Script unavailable offline:", ' +
				JSON.stringify(request.url) +
				");",
			{
				status: 503,
				statusText: "Service Unavailable",
				headers: {
					"Content-Type": "text/javascript; charset=utf-8",
					"Cache-Control": "no-store",
				},
			},
		);
	}

	// 5. Stylesheets: return CSS error with proper content-type
	if (destination === "style" || /\.css$/i.test(url.pathname)) {
		return new Response(
			"/* Service Worker: Offline - stylesheet unavailable */",
			{
				status: 503,
				statusText: "Service Unavailable",
				headers: {
					"Content-Type": "text/css; charset=utf-8",
					"Cache-Control": "no-store",
				},
			},
		);
	}

	// 6. Fonts: return empty 503
	if (
		destination === "font" ||
		/\.(woff|woff2|ttf|otf|eot)$/i.test(url.pathname)
	) {
		return new Response(null, {
			status: 503,
			statusText: "Service Unavailable",
			headers: { "Cache-Control": "no-store" },
		});
	}

	// 7. Generic fallback for other assets
	return new Response("Service Unavailable: Offline and resource not cached.", {
		status: 503,
		statusText: "Service Unavailable",
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "no-store",
		},
	});
}
