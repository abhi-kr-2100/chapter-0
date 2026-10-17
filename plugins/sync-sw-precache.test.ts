import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	computePrecacheRevision,
	syncSwPrecache,
	updateCacheName,
	updatePrecacheAssets,
} from "./sync-sw-precache.ts";

describe("plugins/sync-sw-precache", () => {
	describe("updatePrecacheAssets", () => {
		it("should merge existing and emitted assets with proper formatting", () => {
			const initialCode = `
const CACHE_NAME = "chapter0-dev";
const PRECACHE_ASSETS = [
	"/",
	"/offline.html",
];
`;
			const emittedAssets = ["/assets/main.js", "/assets/style.css", "/"];
			const { updatedCode, combinedAssets } = updatePrecacheAssets(
				initialCode,
				emittedAssets,
			);

			expect(combinedAssets).toEqual([
				"/",
				"/offline.html",
				"/assets/main.js",
				"/assets/style.css",
			]);
			expect(updatedCode).toContain('\t"/assets/main.js",');
			expect(updatedCode).toContain('\t"/assets/style.css",');
			expect(updatedCode).toContain('\t"/",');
			expect(updatedCode).toContain('\t"/offline.html",');
		});

		it("should throw an error when PRECACHE_ASSETS is missing", () => {
			const invalidCode = 'const CACHE_NAME = "chapter0-dev";';
			expect(() =>
				updatePrecacheAssets(invalidCode, ["/assets/main.js"]),
			).toThrow("Failed to locate PRECACHE_ASSETS array in service-worker.js");
		});
	});

	describe("computePrecacheRevision", () => {
		let testDir: string;

		beforeEach(async () => {
			testDir = await fs.mkdtemp(join(tmpdir(), "sw-precache-test-"));
			await fs.mkdir(join(testDir, "reader"), { recursive: true });
			await fs.mkdir(join(testDir, "assets"), { recursive: true });

			await fs.writeFile(join(testDir, "index.html"), "<h1>Home</h1>", "utf-8");
			await fs.writeFile(
				join(testDir, "reader", "index.html"),
				"<h1>Reader</h1>",
				"utf-8",
			);
			await fs.writeFile(
				join(testDir, "offline.html"),
				"<h1>Offline</h1>",
				"utf-8",
			);
			await fs.writeFile(
				join(testDir, "favicon.ico"),
				"fake-binary-ico",
				"utf-8",
			);
		});

		afterEach(async () => {
			await fs.rm(testDir, { recursive: true, force: true });
		});

		it("should compute deterministic revision across all asset path types based on content and filenames", async () => {
			const assets = [
				"/", // tests asset === "/"
				"/reader/", // tests asset.endsWith("/")
				"/offline.html", // tests asset.startsWith("/")
				"favicon.ico", // tests !asset.startsWith("/") branch of ternary
			];

			const revision1 = await computePrecacheRevision(testDir, assets);
			const revision2 = await computePrecacheRevision(testDir, assets);

			expect(revision1).toHaveLength(10);
			expect(revision1).toBe(revision2);
		});
	});

	describe("updateCacheName", () => {
		it("should update CACHE_NAME with double quotes", () => {
			const initialCode =
				'const CACHE_NAME = "chapter0-dev";\nconst other = true;';
			const updated = updateCacheName(initialCode, "abc1234567");
			expect(updated).toBe(
				'const CACHE_NAME = "chapter0-abc1234567";\nconst other = true;',
			);
		});

		it("should update CACHE_NAME with single quotes", () => {
			const initialCode = "const CACHE_NAME = 'chapter0-old';";
			const updated = updateCacheName(initialCode, "9998887776");
			expect(updated).toBe('const CACHE_NAME = "chapter0-9998887776";');
		});

		it("should throw an error when CACHE_NAME is missing", () => {
			const invalidCode = "const SOME_OTHER_VAR = 'none';";
			expect(() => updateCacheName(invalidCode, "rev123")).toThrow(
				"Failed to locate CACHE_NAME in service-worker.js",
			);
		});
	});

	describe("syncSwPrecache plugin", () => {
		let testDir: string;

		beforeEach(async () => {
			testDir = await fs.mkdtemp(join(tmpdir(), "sw-plugin-test-"));
			await fs.mkdir(join(testDir, "dist", "assets"), { recursive: true });

			await fs.writeFile(
				join(testDir, "dist", "index.html"),
				"<html>Home</html>",
				"utf-8",
			);
			await fs.writeFile(
				join(testDir, "dist", "assets", "chunk-1.js"),
				"console.log('chunk');",
				"utf-8",
			);
			await fs.writeFile(
				join(testDir, "dist", "service-worker.js"),
				`const CACHE_NAME = "chapter0-dev";\nconst PRECACHE_ASSETS = [\n\t"/",\n];\n`,
				"utf-8",
			);
		});

		afterEach(async () => {
			await fs.rm(testDir, { recursive: true, force: true });
		});

		it("should provide correct plugin metadata", () => {
			const plugin = syncSwPrecache({ distDir: testDir });
			expect(plugin.name).toBe("sync-sw-precache");
			expect(plugin.apply).toBe("build");
		});

		it("should update service-worker.js on closeBundle with provided distDir", async () => {
			const distDir = join(testDir, "dist");
			const plugin = syncSwPrecache({ distDir });

			if (typeof plugin.closeBundle === "function") {
				await (plugin.closeBundle as () => Promise<void>)();
			}

			const swContent = await fs.readFile(
				join(distDir, "service-worker.js"),
				"utf-8",
			);
			expect(swContent).toMatch(/const CACHE_NAME = "chapter0-[a-f0-9]{10}";/);
			expect(swContent).toContain('"/assets/chunk-1.js"');
			expect(swContent).toContain('"/"');
		});
	});
});
