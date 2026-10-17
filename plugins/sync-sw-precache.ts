import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

export function updatePrecacheAssets(
	swCode: string,
	emittedAssets: string[],
): { updatedCode: string; combinedAssets: string[] } {
	let matched = false;
	let combinedAssets: string[] = [];

	const updatedCode = swCode.replace(
		/const PRECACHE_ASSETS = \[([\s\S]*?)\];/,
		(_match, inner) => {
			matched = true;
			const existing = inner
				.split("\n")
				.map((line: string) => line.trim().replace(/['",]/g, ""))
				.filter(Boolean);
			combinedAssets = Array.from(new Set([...existing, ...emittedAssets]));
			const formatted = combinedAssets
				.map((asset) => `\t"${asset}",`)
				.join("\n");
			return `const PRECACHE_ASSETS = [\n${formatted}\n];`;
		},
	);

	if (!matched) {
		throw new Error(
			"Failed to locate PRECACHE_ASSETS array in service-worker.js",
		);
	}

	return { updatedCode, combinedAssets };
}

export async function computePrecacheRevision(
	distDir: string,
	assets: string[],
): Promise<string> {
	const hash = createHash("sha256");

	for (const asset of [...assets].sort()) {
		let filePath: string;
		if (asset === "/") {
			filePath = resolve(distDir, "index.html");
		} else if (asset.endsWith("/")) {
			filePath = resolve(distDir, asset.slice(1), "index.html");
		} else {
			filePath = resolve(
				distDir,
				asset.startsWith("/") ? asset.slice(1) : asset,
			);
		}

		hash.update(asset);
		const content = await fs.readFile(filePath);
		hash.update(content);
	}

	return hash.digest("hex").slice(0, 10);
}

export function updateCacheName(swCode: string, revision: string): string {
	let matched = false;
	const updatedCode = swCode.replace(
		/const CACHE_NAME = ["'][^"']+["'];/,
		() => {
			matched = true;
			return `const CACHE_NAME = "chapter0-${revision}";`;
		},
	);

	if (!matched) {
		throw new Error("Failed to locate CACHE_NAME in service-worker.js");
	}

	return updatedCode;
}

export interface SyncSwPrecacheOptions {
	distDir: string;
}

export function syncSwPrecache(options: SyncSwPrecacheOptions): Plugin {
	const distDir = options.distDir;

	return {
		name: "sync-sw-precache",
		apply: "build",
		async closeBundle() {
			const swPath = resolve(distDir, "service-worker.js");
			const swCode = await fs.readFile(swPath, "utf-8");

			const assetsDir = resolve(distDir, "assets");
			const assetFiles = (await fs.readdir(assetsDir)).sort();
			const emittedAssets = assetFiles.map((file) => `/assets/${file}`);

			const { updatedCode: withAssets, combinedAssets } = updatePrecacheAssets(
				swCode,
				emittedAssets,
			);
			const revision = await computePrecacheRevision(distDir, combinedAssets);
			const finalCode = updateCacheName(withAssets, revision);

			await fs.writeFile(swPath, finalCode, "utf-8");
		},
	};
}
