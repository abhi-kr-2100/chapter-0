import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import nextConfig, { type AppConfig } from "../next.config";

export interface GenerateSWOptions {
  outDir: string;
  publicDir: string;
  cachePrefix: string;
  writeFiles: boolean;
}

export interface GenerateSWResult {
  cacheName: string;
  hash: string;
  assets: string[];
  code: string;
  outputPath: string;
  publicPath: string;
}

const EXCLUDED_EXTENSIONS = new Set([".map"]);
const EXCLUDED_FILENAMES = new Set(["sw.js"]);

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function collectPrecacheAssets(outDir: string): Promise<string[]> {
  if (!(await pathExists(outDir))) {
    throw new Error(`Output directory does not exist: ${outDir}`);
  }

  const assets: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        if (EXCLUDED_FILENAMES.has(entry.name)) {
          continue;
        }
        const ext = path.extname(entry.name).toLowerCase();
        if (EXCLUDED_EXTENSIONS.has(ext)) {
          continue;
        }

        const relative = path
          .relative(outDir, fullPath)
          .split(path.sep)
          .join("/");
        assets.push(`/${relative}`);
      }
    }
  }

  await walk(outDir);

  if (assets.includes("/index.html")) {
    assets.push("/");
  }

  assets.sort();
  return assets;
}

export async function computeCacheHash(
  outDir: string,
  assetPaths: string[],
): Promise<string> {
  const hasher = crypto.createHash("sha256");

  for (const relPath of assetPaths) {
    // Skip "/" because it maps to the same physical index.html file as "/index.html"
    if (relPath === "/") {
      continue;
    }

    const diskPath = relPath.replace(/^\//, "");
    const fullPath = path.join(outDir, diskPath);

    if (await pathExists(fullPath)) {
      hasher.update(relPath);
      hasher.update(await fs.readFile(fullPath));
    }
  }

  return hasher.digest("hex").slice(0, 12);
}

export function generateServiceWorkerCode(
  cachePrefix: string,
  cacheName: string,
  precacheAssets: string[],
): string {
  const assetsFormatted = precacheAssets
    .map((asset) => `  ${JSON.stringify(asset)},`)
    .join("\n");

  return `/// <reference lib="webworker" />

const CACHE_PREFIX = ${JSON.stringify(cachePrefix)};
const CACHE_NAME = ${JSON.stringify(cacheName)};

const PRECACHE_ASSETS = [
${assetsFormatted}
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(\`\${CACHE_PREFIX}-\`) && key !== CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 1. Navigation requests (HTML pages)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request, { ignoreSearch: true });
        return (
          cached ??
          (await cache.match("/404.html")) ??
          Response.error()
        );
      }),
    );
    return;
  }

  // 2. Same-origin assets (Cache-first with runtime caching)
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            event.waitUntil(
              cache.put(request, networkResponse.clone()).catch(() => {}),
            );
          }
          return networkResponse;
        } catch {
          return Response.error();
        }
      }),
    );
  }
});
`;
}

export async function generateServiceWorker(
  options: GenerateSWOptions,
): Promise<GenerateSWResult> {
  const outDir = path.resolve(options.outDir);
  const publicDir = path.resolve(options.publicDir);
  const cachePrefix = options.cachePrefix;
  const writeFiles = options.writeFiles;

  const assets = await collectPrecacheAssets(outDir);
  const hash = await computeCacheHash(outDir, assets);
  const cacheName = `${cachePrefix}-${hash}`;
  const code = generateServiceWorkerCode(cachePrefix, cacheName, assets);

  const outputPath = path.join(outDir, "sw.js");
  const publicPath = path.join(publicDir, "sw.js");

  if (writeFiles) {
    await fs.writeFile(outputPath, code);
    if (await pathExists(publicDir)) {
      await fs.writeFile(publicPath, code);
    }
  }

  return {
    cacheName,
    hash,
    assets,
    code,
    outputPath,
    publicPath,
  };
}

export function calculateDefaultSwOptions(
  config: AppConfig,
): GenerateSWOptions {
  return {
    outDir: config.distDir,
    publicDir: "public",
    cachePrefix: "chapter0",
    writeFiles: true,
  };
}

export const DEFAULT_SW_OPTIONS: GenerateSWOptions =
  calculateDefaultSwOptions(nextConfig);

export async function runCli(
  options: GenerateSWOptions,
): Promise<GenerateSWResult> {
  const result = await generateServiceWorker(options);
  console.log(
    `[generate:sw] Generated service worker with ${result.assets.length} precached assets. Cache: ${result.cacheName}`,
  );
  return result;
}
