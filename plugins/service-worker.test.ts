import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import {
	createFailureResponse,
	hasNoStoreOrPrivate,
	hasVaryStar,
	isApiRequest,
	isApiResponse,
	isCacheableRequest,
	isCacheableResponse,
	isCredentialedRequest,
} from "../public/sw-cache-rules.js";

function createNavigationRequest(url: string, init?: RequestInit): Request {
	const req = new Request(url, init);
	Object.defineProperty(req, "mode", { value: "navigate" });
	return req;
}

describe("Service Worker Cache Rules", () => {
	describe("isApiRequest", () => {
		it("should identify /api/ endpoints as API requests", () => {
			const req = new Request("https://example.com/api/user");
			const url = new URL(req.url);
			expect(isApiRequest(req, url)).toBe(true);
		});

		it("should identify requests with application/json accept header", () => {
			const req = new Request("https://example.com/books", {
				headers: { Accept: "application/json" },
			});
			const url = new URL(req.url);
			expect(isApiRequest(req, url)).toBe(true);
		});

		it("should identify requests with application/problem+json accept header", () => {
			const req = new Request("https://example.com/books", {
				headers: { Accept: "application/problem+json" },
			});
			const url = new URL(req.url);
			expect(isApiRequest(req, url)).toBe(true);
		});

		it("should handle missing Accept header and return false for static assets", () => {
			const req = new Request("https://example.com/assets/app.js");
			const url = new URL(req.url);
			expect(isApiRequest(req, url)).toBe(false);
		});

		it("should return false for document navigations", () => {
			const req = new Request("https://example.com/reader/", {
				headers: { Accept: "text/html,application/xhtml+xml" },
			});
			const url = new URL(req.url);
			expect(isApiRequest(req, url)).toBe(false);
		});
	});

	describe("isCredentialedRequest", () => {
		it("should detect Authorization header", () => {
			const req = new Request("https://example.com/data", {
				headers: { Authorization: "Bearer session_token_123" },
			});
			expect(isCredentialedRequest(req)).toBe(true);
		});

		it("should detect Authentication header", () => {
			const req = new Request("https://example.com/data", {
				headers: { Authentication: "Basic dXNlcjpwYXNz" },
			});
			expect(isCredentialedRequest(req)).toBe(true);
		});

		it("should return false for non-credentialed requests", () => {
			const req = new Request("https://example.com/assets/app.js");
			expect(isCredentialedRequest(req)).toBe(false);
		});
	});

	describe("hasNoStoreOrPrivate", () => {
		it("should return false when Cache-Control header is missing", () => {
			const headers = new Headers();
			expect(hasNoStoreOrPrivate(headers)).toBe(false);
		});

		it("should detect no-store directive", () => {
			const headers = new Headers({ "Cache-Control": "no-store" });
			expect(hasNoStoreOrPrivate(headers)).toBe(true);
		});

		it("should detect private directive", () => {
			const headers = new Headers({ "Cache-Control": "private" });
			expect(hasNoStoreOrPrivate(headers)).toBe(true);
		});

		it("should detect compound directives containing private or no-store", () => {
			const headers1 = new Headers({
				"Cache-Control": "private, max-age=0, no-cache",
			});
			const headers2 = new Headers({
				"Cache-Control": "public, no-store, must-revalidate",
			});
			expect(hasNoStoreOrPrivate(headers1)).toBe(true);
			expect(hasNoStoreOrPrivate(headers2)).toBe(true);
		});

		it("should return false for public and standard cacheable headers", () => {
			const headers = new Headers({
				"Cache-Control": "public, max-age=31536000, immutable",
			});
			expect(hasNoStoreOrPrivate(headers)).toBe(false);
		});
	});

	describe("hasVaryStar", () => {
		it("should return false when Vary header is missing", () => {
			const headers = new Headers();
			expect(hasVaryStar(headers)).toBe(false);
		});

		it("should detect Vary: * header", () => {
			const headers = new Headers({ Vary: "*" });
			expect(hasVaryStar(headers)).toBe(true);
		});

		it("should return false for specific non-star Vary headers", () => {
			const headers = new Headers({ Vary: "Accept-Encoding, User-Agent" });
			expect(hasVaryStar(headers)).toBe(false);
		});
	});

	describe("isApiResponse", () => {
		it("should return false when response or Content-Type is missing", () => {
			expect(isApiResponse(null)).toBe(false);
			expect(isApiResponse(new Response())).toBe(false);
		});

		it("should detect application/json content type", () => {
			const res = new Response("{}", {
				headers: { "Content-Type": "application/json; charset=utf-8" },
			});
			expect(isApiResponse(res)).toBe(true);
		});

		it("should detect application/problem+json content type", () => {
			const res = new Response("{}", {
				headers: { "Content-Type": "application/problem+json" },
			});
			expect(isApiResponse(res)).toBe(true);
		});

		it("should return false for static assets and text/html", () => {
			const htmlRes = new Response("<!DOCTYPE html>", {
				headers: { "Content-Type": "text/html; charset=utf-8" },
			});
			const jsRes = new Response("console.log('hi')", {
				headers: { "Content-Type": "text/javascript" },
			});
			expect(isApiResponse(htmlRes)).toBe(false);
			expect(isApiResponse(jsRes)).toBe(false);
		});
	});

	describe("isCacheableRequest", () => {
		it("should accept standard static asset requests", () => {
			const req = new Request("https://example.com/assets/app.js");
			const url = new URL(req.url);
			expect(isCacheableRequest(req, url)).toBe(true);
		});

		it("should reject API requests", () => {
			const req = new Request("https://example.com/api/books");
			const url = new URL(req.url);
			expect(isCacheableRequest(req, url)).toBe(false);
		});

		it("should reject credentialed requests", () => {
			const req = new Request("https://example.com/user/profile", {
				headers: { Authorization: "Bearer xyz" },
			});
			const url = new URL(req.url);
			expect(isCacheableRequest(req, url)).toBe(false);
		});

		it("should reject requests specifying Cache-Control: no-store", () => {
			const req = new Request("https://example.com/assets/app.js", {
				headers: { "Cache-Control": "no-store" },
			});
			const url = new URL(req.url);
			expect(isCacheableRequest(req, url)).toBe(false);
		});
	});

	describe("isCacheableResponse", () => {
		it("should allow cache.put for 200 OK public static assets with basic, cors, or default types", () => {
			const req = new Request("https://example.com/assets/app.js");
			const url = new URL(req.url);

			const basicRes = new Response("console.log()", {
				status: 200,
				headers: {
					"Content-Type": "text/javascript",
					"Cache-Control": "public, max-age=31536000",
				},
			});
			expect(isCacheableResponse(req, basicRes, url)).toBe(true);

			const corsRes = {
				status: 200,
				type: "cors",
				headers: new Headers({ "Content-Type": "text/javascript" }),
			};
			expect(
				isCacheableResponse(req, corsRes as unknown as Response, url),
			).toBe(true);

			const defaultRes = {
				status: 200,
				type: "basic",
				headers: new Headers({ "Content-Type": "text/javascript" }),
			};
			expect(
				isCacheableResponse(req, defaultRes as unknown as Response, url),
			).toBe(true);
		});

		it("should reject uncacheable requests", () => {
			const req = new Request("https://example.com/api/test");
			const url = new URL(req.url);
			const res = new Response("{}", { status: 200 });
			expect(isCacheableResponse(req, res, url)).toBe(false);
		});

		it("should reject non-200 responses or missing response", () => {
			const req = new Request("https://example.com/assets/missing.js");
			const url = new URL(req.url);
			expect(isCacheableResponse(req, null as unknown as Response, url)).toBe(
				false,
			);

			const res404 = new Response(null, { status: 404 });
			const res500 = new Response(null, { status: 500 });
			expect(isCacheableResponse(req, res404, url)).toBe(false);
			expect(isCacheableResponse(req, res500, url)).toBe(false);
		});

		it("should reject opaque or non-supported response types", () => {
			const req = new Request("https://example.com/assets/app.js");
			const url = new URL(req.url);
			const opaqueRes = {
				status: 200,
				type: "opaque",
				headers: new Headers(),
			};
			expect(
				isCacheableResponse(req, opaqueRes as unknown as Response, url),
			).toBe(false);
		});

		it("should reject cache.put when response has Cache-Control: no-store", () => {
			const req = new Request("https://example.com/data.txt");
			const url = new URL(req.url);
			const res = new Response("secret", {
				status: 200,
				headers: {
					"Content-Type": "text/plain",
					"Cache-Control": "no-store",
				},
			});
			expect(isCacheableResponse(req, res, url)).toBe(false);
		});

		it("should reject cache.put when response has Cache-Control: private", () => {
			const req = new Request("https://example.com/user/export");
			const url = new URL(req.url);
			const res = new Response("user data", {
				status: 200,
				headers: {
					"Content-Type": "text/plain",
					"Cache-Control": "private, max-age=3600",
				},
			});
			expect(isCacheableResponse(req, res, url)).toBe(false);
		});

		it("should reject cache.put for API JSON responses", () => {
			const req = new Request("https://example.com/books");
			const url = new URL(req.url);
			const res = new Response("[]", {
				status: 200,
				headers: {
					"Content-Type": "application/json",
				},
			});
			expect(isCacheableResponse(req, res, url)).toBe(false);
		});

		it("should reject cache.put when response has Vary: *", () => {
			const req = new Request("https://example.com/assets/app.js");
			const url = new URL(req.url);
			const res = new Response("code", {
				status: 200,
				headers: {
					"Content-Type": "text/javascript",
					Vary: "*",
				},
			});
			expect(isCacheableResponse(req, res, url)).toBe(false);
		});

		it("should reject cache.put when response is redirected", () => {
			const req = new Request("https://example.com/reader");
			const url = new URL(req.url);
			const res = new Response("redirected destination", {
				status: 200,
				headers: {
					"Content-Type": "text/html",
				},
			});
			Object.defineProperty(res, "redirected", { value: true });
			expect(isCacheableResponse(req, res, url)).toBe(false);
		});
	});

	describe("createFailureResponse", () => {
		const originalCaches = (globalThis as unknown as { caches: unknown })
			.caches;

		afterEach(() => {
			(globalThis as unknown as { caches: unknown }).caches = originalCaches;
		});

		it("should return pre-cached offline page for navigation requests when available", async () => {
			const mockPage = new Response("<h1>Cached Offline Page</h1>", {
				status: 200,
			});
			(globalThis as unknown as { caches: unknown }).caches = {
				match: async (path: string) => {
					if (path === "/offline.html") return mockPage;
					return undefined;
				},
			};

			const req = createNavigationRequest("https://example.com/reader/");
			const res = await createFailureResponse(req);
			expect(res).toBe(mockPage);
		});

		it("should return 503 fallback when offline.html is not in cache or caches undefined", async () => {
			(globalThis as unknown as { caches: unknown }).caches = {
				match: async () => undefined,
			};
			const req = createNavigationRequest("https://example.com/reader/");
			const res = await createFailureResponse(req);
			expect(res.status).toBe(503);
			expect(await res.text()).toBe("Offline: Page unavailable");
		});

		it("should return 503 fallback for document destination when caches is not defined", async () => {
			(globalThis as unknown as { caches: unknown }).caches = undefined;
			const req = new Request("https://example.com/reader/", {
				headers: { Accept: "text/html" },
			});
			Object.defineProperty(req, "destination", { value: "document" });
			const res = await createFailureResponse(req);
			expect(res.status).toBe(503);
			expect(await res.text()).toBe("Offline: Page unavailable");
		});

		it("should return JSON error response for API requests", async () => {
			const req = new Request("https://example.com/api/library");
			const res = await createFailureResponse(req);
			expect(res.status).toBe(503);
			expect(res.headers.get("Content-Type")).toContain("application/json");
			expect(res.headers.get("Cache-Control")).toBe("no-store");

			const json = await res.json();
			expect(json.error).toBe("Service Unavailable");
		});

		it("should return cached offline.svg for image requests when available", async () => {
			const mockSvg = new Response("<svg>offline</svg>", { status: 200 });
			(globalThis as unknown as { caches: unknown }).caches = {
				match: async (path: string) => {
					if (path === "/offline.svg") return mockSvg;
					return undefined;
				},
			};

			const req = new Request("https://example.com/cover.png");
			Object.defineProperty(req, "destination", { value: "image" });
			const res = await createFailureResponse(req);
			expect(res).toBe(mockSvg);
		});

		it("should return empty 503 for image requests when offline.svg is not cached", async () => {
			(globalThis as unknown as { caches: unknown }).caches = {
				match: async () => undefined,
			};
			const req = new Request("https://example.com/photo.webp");
			const res = await createFailureResponse(req);
			expect(res.status).toBe(503);
		});

		it("should return JS script error for script/worker requests", async () => {
			const req = new Request("https://example.com/script.js");
			const res = await createFailureResponse(req);
			expect(res.status).toBe(503);
			expect(res.headers.get("Content-Type")).toContain("text/javascript");
			expect(await res.text()).toContain("Script unavailable offline");

			const workerReq = new Request("https://example.com/worker.worker");
			Object.defineProperty(workerReq, "destination", { value: "worker" });
			const workerRes = await createFailureResponse(workerReq);
			expect(workerRes.status).toBe(503);
		});

		it("should return CSS error for style requests", async () => {
			const req = new Request("https://example.com/style.css");
			const res = await createFailureResponse(req);
			expect(res.status).toBe(503);
			expect(res.headers.get("Content-Type")).toContain("text/css");
			expect(await res.text()).toContain("stylesheet unavailable");
		});

		it("should return empty 503 for font requests", async () => {
			const req = new Request("https://example.com/font.woff2");
			const res = await createFailureResponse(req);
			expect(res.status).toBe(503);
			expect(res.headers.get("Cache-Control")).toBe("no-store");
		});

		it("should return generic text fallback for other resource types", async () => {
			const req = new Request("https://example.com/unknown.bin");
			const res = await createFailureResponse(req);
			expect(res.status).toBe(503);
			expect(res.headers.get("Content-Type")).toContain("text/plain");
			expect(await res.text()).toBe(
				"Service Unavailable: Offline and resource not cached.",
			);
		});
	});

	describe("Service Worker Lifecycle and Fetch Handling", () => {
		type Listener = (event: unknown) => void;
		interface MockScope {
			self?: unknown;
			addEventListener?: unknown;
			clients?: unknown;
			skipWaiting?: unknown;
		}

		const listeners = new Map<string, Listener>();
		const globalScope = globalThis as unknown as MockScope;
		const hadSelf = "self" in globalThis;
		const originalSelf = globalScope.self;
		if (!hadSelf || !globalScope.self) {
			globalScope.self = globalThis;
		}
		const swScope = (globalThis as unknown as { self: MockScope }).self;
		const originalAddEventListener = swScope.addEventListener;
		const originalCaches = (globalThis as unknown as { caches: unknown })
			.caches;
		const originalFetch = globalThis.fetch;
		const originalClients = swScope.clients;
		const originalSkipWaiting = swScope.skipWaiting;

		beforeAll(async () => {
			swScope.addEventListener = ((type: string, listener: Listener) => {
				listeners.set(type, listener);
			}) as unknown;

			await import("../public/service-worker.js");
			swScope.addEventListener = originalAddEventListener;
		});

		afterAll(() => {
			if (!hadSelf) {
				delete globalScope.self;
			} else {
				globalScope.self = originalSelf;
			}
		});

		afterEach(() => {
			(globalThis as unknown as { caches: unknown }).caches = originalCaches;
			globalThis.fetch = originalFetch;
			swScope.clients = originalClients;
			swScope.skipWaiting = originalSkipWaiting;
		});

		describe("install event", () => {
			it("should cache precache assets during install", async () => {
				let passedAssets: string[] = [];
				let waitPromise: Promise<unknown> | undefined;

				const mockCache = {
					addAll: async (assets: string[]) => {
						passedAssets = assets;
					},
				};

				(globalThis as unknown as { caches: unknown }).caches = {
					open: async () => mockCache,
				};

				const installListener = listeners.get("install");
				if (!installListener) throw new Error("installListener not found");

				installListener({
					waitUntil: (p: Promise<unknown>) => {
						waitPromise = p;
					},
				});

				await waitPromise;
				expect(passedAssets).toContain("/");
				expect(passedAssets).toContain("/reader/");
				expect(passedAssets).toContain("/offline.html");
			});
		});

		describe("activate event", () => {
			it("should clean up outdated caches and claim clients", async () => {
				const deletedCaches: string[] = [];
				let claimed = false;
				let waitPromise: Promise<unknown> | undefined;

				(globalThis as unknown as { caches: unknown }).caches = {
					keys: async () => ["chapter0-dev", "old-cache-v1", "old-cache-v2"],
					delete: async (key: string) => {
						deletedCaches.push(key);
						return true;
					},
				};

				(
					swScope as unknown as { clients: { claim: () => Promise<void> } }
				).clients = {
					claim: async () => {
						claimed = true;
					},
				};

				const activateListener = listeners.get("activate");
				if (!activateListener) throw new Error("activateListener not found");

				activateListener({
					waitUntil: (p: Promise<unknown>) => {
						waitPromise = p;
					},
				});

				await waitPromise;
				expect(deletedCaches).toEqual(["old-cache-v1", "old-cache-v2"]);
				expect(claimed).toBe(true);
			});
		});

		describe("message event", () => {
			it("should call skipWaiting when SKIP_WAITING message is received", () => {
				let skipWaitingCalled = false;
				(swScope as unknown as { skipWaiting: () => void }).skipWaiting =
					() => {
						skipWaitingCalled = true;
					};

				const messageListener = listeners.get("message");
				if (!messageListener) throw new Error("messageListener not found");

				messageListener({ data: null });
				expect(skipWaitingCalled).toBe(false);

				messageListener({ data: { type: "OTHER_MESSAGE" } });
				expect(skipWaitingCalled).toBe(false);

				messageListener({ data: { type: "SKIP_WAITING" } });
				expect(skipWaitingCalled).toBe(true);
			});
		});

		describe("fetch event", () => {
			function dispatchFetch(
				request: Request,
				onRespondWith?: () => void,
			): {
				respondWithPromise?: Promise<Response>;
				readonly waitUntilPromise?: Promise<unknown>;
			} {
				let respondWithPromise: Promise<Response> | undefined;
				let waitUntilPromise: Promise<unknown> | undefined;

				const fetchListener = listeners.get("fetch");
				fetchListener?.({
					request,
					respondWith: (p: Promise<Response>) => {
						onRespondWith?.();
						respondWithPromise = p;
					},
					waitUntil: (p: Promise<unknown>) => {
						waitUntilPromise = p;
					},
				});

				return {
					respondWithPromise,
					get waitUntilPromise() {
						return waitUntilPromise;
					},
				};
			}

			async function fetchResponse(request: Request): Promise<{
				response: Response;
				waitUntilPromise?: Promise<unknown>;
			}> {
				const result = dispatchFetch(request);
				if (!result.respondWithPromise) {
					throw new Error("respondWith was not called");
				}
				const response = await result.respondWithPromise;
				return { response, waitUntilPromise: result.waitUntilPromise };
			}

			function setupMockCaches() {
				const libraryShell = new Response("<h1>Library Shell</h1>", {
					status: 200,
				});
				const readerShell = new Response("<h1>Reader Shell</h1>", {
					status: 200,
				});
				const offlineShell = new Response("<h1>Offline Page Shell</h1>", {
					status: 200,
				});

				const mockCache = {
					match: async (target: string | Request) => {
						const path =
							typeof target === "string"
								? target
								: new URL(target.url).pathname;
						if (path === "/") return libraryShell.clone();
						if (path === "/reader/") return readerShell.clone();
						if (path === "/offline.html") return offlineShell.clone();
						return undefined;
					},
					put: async () => {},
				};

				(globalThis as unknown as { caches: unknown }).caches = {
					open: async () => mockCache,
					match: async (target: string | Request) => mockCache.match(target),
				};
			}

			it("should ignore non-GET requests", () => {
				let called = false;
				dispatchFetch(
					new Request("https://example.com/", { method: "POST" }),
					() => {
						called = true;
					},
				);
				expect(called).toBe(false);
			});

			it("should ignore non-HTTP requests", () => {
				let called = false;
				dispatchFetch(
					new Request("chrome-extension://some-extension/page"),
					() => {
						called = true;
					},
				);
				expect(called).toBe(false);
			});

			it("should bypass fetch handler for requests with Range header", () => {
				let called = false;
				dispatchFetch(
					new Request("https://example.com/stream.mp4", {
						headers: { Range: "bytes=0-1023" },
					}),
					() => {
						called = true;
					},
				);
				expect(called).toBe(false);
			});

			it("should bypass cache check for uncacheable requests such as API routes", async () => {
				setupMockCaches();
				globalThis.fetch = (async () =>
					new Response(JSON.stringify({ status: "ok" }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					})) as unknown as typeof fetch;

				const req = new Request("https://example.com/api/status");
				const { response } = await fetchResponse(req);
				expect(response.status).toBe(200);
			});

			it("should serve cached asset immediately and revalidate in background", async () => {
				setupMockCaches();
				let networkCalled = false;
				globalThis.fetch = (async () => {
					networkCalled = true;
					return new Response("revalidated", { status: 200 });
				}) as unknown as typeof fetch;

				const req = new Request("https://example.com/");
				const { response, waitUntilPromise } = await fetchResponse(req);
				expect(await response.text()).toBe("<h1>Library Shell</h1>");
				await waitUntilPromise;
				expect(networkCalled).toBe(true);
			});

			it("should handle background revalidation network failure gracefully when cached copy was served", async () => {
				setupMockCaches();
				globalThis.fetch = (async () => {
					throw new TypeError("Background network failed");
				}) as unknown as typeof fetch;

				const req = new Request("https://example.com/");
				const { response, waitUntilPromise } = await fetchResponse(req);
				expect(await response.text()).toBe("<h1>Library Shell</h1>");
				await waitUntilPromise;
			});

			it("should wait for cache.put revalidation to complete in waitUntilPromise", async () => {
				let cachePutFinished = false;
				const mockCache = {
					match: async (_target?: string | Request) =>
						new Response("<h1>Library Shell</h1>", { status: 200 }),
					put: async () => {
						await new Promise((resolve) => setTimeout(resolve, 20));
						cachePutFinished = true;
					},
				};
				(globalThis as unknown as { caches: unknown }).caches = {
					open: async () => mockCache,
					match: async (target: string | Request) => mockCache.match(target),
				};

				globalThis.fetch = (async () =>
					new Response("<h1>Updated Library Shell</h1>", {
						status: 200,
						headers: { "Content-Type": "text/html" },
					})) as unknown as typeof fetch;

				const req = new Request("https://example.com/");
				const { response, waitUntilPromise } = await fetchResponse(req);
				expect(await response.text()).toBe("<h1>Library Shell</h1>");
				expect(cachePutFinished).toBe(false);
				await waitUntilPromise;
				expect(cachePutFinished).toBe(true);
			});

			it("should handle cache.put write failures gracefully during background revalidation", async () => {
				const mockCache = {
					match: async (_target?: string | Request) =>
						new Response("<h1>Library Shell</h1>", { status: 200 }),
					put: async () => {
						throw new Error("QuotaExceededError");
					},
				};
				(globalThis as unknown as { caches: unknown }).caches = {
					open: async () => mockCache,
					match: async (target: string | Request) => mockCache.match(target),
				};

				globalThis.fetch = (async () =>
					new Response("<h1>Updated Library Shell</h1>", {
						status: 200,
						headers: { "Content-Type": "text/html" },
					})) as unknown as typeof fetch;

				const req = new Request("https://example.com/");
				const { response, waitUntilPromise } = await fetchResponse(req);
				expect(await response.text()).toBe("<h1>Library Shell</h1>");
				await expect(waitUntilPromise).resolves.toBeDefined();
			});

			it("should preserve network response when cache.put fails on fresh network fetch", async () => {
				const mockCache = {
					match: async () => undefined,
					put: async () => {
						throw new Error("QuotaExceededError");
					},
				};
				(globalThis as unknown as { caches: unknown }).caches = {
					open: async () => mockCache,
					match: async () => undefined,
				};

				globalThis.fetch = (async () =>
					new Response("<h1>Fresh Page</h1>", {
						status: 200,
						headers: { "Content-Type": "text/html" },
					})) as unknown as typeof fetch;

				const req = createNavigationRequest("https://example.com/fresh-page");
				const { response } = await fetchResponse(req);
				expect(response.status).toBe(200);
				expect(await response.text()).toBe("<h1>Fresh Page</h1>");
			});

			it("should serve library shell for '/' navigation", async () => {
				setupMockCaches();
				const req = createNavigationRequest("https://example.com/");
				const { response } = await fetchResponse(req);
				expect(await response.text()).toBe("<h1>Library Shell</h1>");
			});

			it("should serve library shell for '/index.html' navigation", async () => {
				setupMockCaches();
				const req = createNavigationRequest("https://example.com/index.html");
				const { response } = await fetchResponse(req);
				expect(await response.text()).toBe("<h1>Library Shell</h1>");
			});

			it("should serve library shell for '/?ref=twitter' navigation", async () => {
				setupMockCaches();
				const req = createNavigationRequest("https://example.com/?ref=twitter");
				const { response } = await fetchResponse(req);
				expect(await response.text()).toBe("<h1>Library Shell</h1>");
			});

			it("should serve reader shell for '/reader/' navigation", async () => {
				setupMockCaches();
				const req = createNavigationRequest("https://example.com/reader/");
				const { response } = await fetchResponse(req);
				expect(await response.text()).toBe("<h1>Reader Shell</h1>");
			});

			it("should serve reader shell for '/reader/book-123' navigation", async () => {
				setupMockCaches();
				const req = createNavigationRequest(
					"https://example.com/reader/book-123",
				);
				const { response } = await fetchResponse(req);
				expect(await response.text()).toBe("<h1>Reader Shell</h1>");
			});

			it("should not match reader shell for similarly prefixed routes like /readernotes", async () => {
				setupMockCaches();
				globalThis.fetch = (async () =>
					new Response("<h1>Reader Notes</h1>", {
						status: 200,
						headers: { "Content-Type": "text/html" },
					})) as unknown as typeof fetch;

				const req = createNavigationRequest("https://example.com/readernotes");
				const { response } = await fetchResponse(req);
				expect(await response.text()).toBe("<h1>Reader Notes</h1>");
			});

			it("should serve offline shell for '/offline' navigation", async () => {
				setupMockCaches();
				const req = createNavigationRequest("https://example.com/offline");
				const { response } = await fetchResponse(req);
				expect(await response.text()).toBe("<h1>Offline Page Shell</h1>");
			});

			it("should serve reader shell when destination is document", async () => {
				setupMockCaches();
				const req = new Request("https://example.com/reader/doc", {
					headers: { Accept: "text/html" },
				});
				Object.defineProperty(req, "destination", { value: "document" });
				const { response } = await fetchResponse(req);
				expect(await response.text()).toBe("<h1>Reader Shell</h1>");
			});

			it("should cache successful canonical shell and non-navigation network responses, and leave unknown navigations uncached", async () => {
				const putItems = new Map<string, Response>();
				const mockCache = {
					match: async () => undefined,
					put: async (key: Request, val: Response) => {
						putItems.set(key.url, val);
					},
				};
				(globalThis as unknown as { caches: unknown }).caches = {
					open: async () => mockCache,
					match: async () => undefined,
				};

				globalThis.fetch = (async () =>
					new Response("<h1>Brand New Page</h1>", {
						status: 200,
						headers: { "Content-Type": "text/html" },
					})) as unknown as typeof fetch;

				const req = createNavigationRequest("https://example.com/new-page");
				const { response } = await fetchResponse(req);
				expect(await response.text()).toBe("<h1>Brand New Page</h1>");
				// Non-canonical navigation should not be cached
				expect(putItems.has("https://example.com/new-page")).toBe(false);

				// Canonical navigation should be cached
				const canonicalReq = createNavigationRequest("https://example.com/");
				await fetchResponse(canonicalReq);
				expect(putItems.has("https://example.com/")).toBe(true);

				// Non-navigation static asset should be cached
				const assetReq = new Request("https://example.com/assets/app.js");
				globalThis.fetch = (async () =>
					new Response("console.log(1)", {
						status: 200,
						headers: { "Content-Type": "text/javascript" },
					})) as unknown as typeof fetch;
				await fetchResponse(assetReq);
				expect(putItems.has("https://example.com/assets/app.js")).toBe(true);
			});

			it("should not cache uncacheable network responses", async () => {
				let putCalled = false;
				const mockCache = {
					match: async () => undefined,
					put: async () => {
						putCalled = true;
					},
				};
				(globalThis as unknown as { caches: unknown }).caches = {
					open: async () => mockCache,
					match: async () => undefined,
				};

				globalThis.fetch = (async () =>
					new Response("Internal Server Error", {
						status: 500,
						headers: { "Content-Type": "text/plain" },
					})) as unknown as typeof fetch;

				const req = createNavigationRequest("https://example.com/error-page");
				const { response } = await fetchResponse(req);
				expect(response.status).toBe(500);
				expect(putCalled).toBe(false);
			});

			it("should leave unknown navigations uncached and serve fresh network response online", async () => {
				setupMockCaches();
				globalThis.fetch = (async () =>
					new Response("<h1>Unknown Online Page</h1>", {
						status: 200,
						headers: { "Content-Type": "text/html" },
					})) as unknown as typeof fetch;

				const req = createNavigationRequest(
					"https://example.com/some/unknown/route",
				);
				const { response } = await fetchResponse(req);
				expect(await response.text()).toBe("<h1>Unknown Online Page</h1>");
			});

			it("should fall back to offline page for unknown navigations when offline", async () => {
				setupMockCaches();
				globalThis.fetch = (async () => {
					throw new TypeError("Failed to fetch");
				}) as unknown as typeof fetch;

				const req = createNavigationRequest(
					"https://example.com/some/unknown/route",
				);
				const { response } = await fetchResponse(req);
				expect(await response.text()).toBe("<h1>Offline Page Shell</h1>");
			});
		});
	});
});
