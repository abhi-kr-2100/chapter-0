import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import nextConfig, { type AppConfig } from "../next.config";
import {
  calculateDefaultSwOptions,
  collectPrecacheAssets,
  computeCacheHash,
  DEFAULT_SW_OPTIONS,
  generateServiceWorker,
  generateServiceWorkerCode,
  pathExists,
  runCli,
} from "./generate-sw";

describe("generate-sw unit tests", () => {
  let tempBaseDir: string;

  beforeEach(async () => {
    tempBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), "sw-unit-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempBaseDir, { recursive: true, force: true });
  });

  describe("pathExists", () => {
    it("returns true when path exists and false when path does not exist", async () => {
      const existingDir = path.join(tempBaseDir, "exists");
      await fs.mkdir(existingDir, { recursive: true });
      expect(await pathExists(existingDir)).toBe(true);

      const nonExistentPath = path.join(tempBaseDir, "does-not-exist");
      expect(await pathExists(nonExistentPath)).toBe(false);
    });
  });

  describe("collectPrecacheAssets", () => {
    it("throws an error when output directory does not exist", async () => {
      const nonExistentDir = path.join(tempBaseDir, "does-not-exist");
      await expect(collectPrecacheAssets(nonExistentDir)).rejects.toThrow(
        `Output directory does not exist: ${nonExistentDir}`,
      );
    });

    it("collects files recursively, excludes sw.js and .map files, and adds / when index.html is present", async () => {
      const outDir = path.join(tempBaseDir, "out");
      await fs.mkdir(outDir, { recursive: true });
      await fs.mkdir(path.join(outDir, "nested", "deep"), { recursive: true });

      await fs.writeFile(
        path.join(outDir, "index.html"),
        "<h1>Home</h1>",
        "utf8",
      );
      await fs.writeFile(path.join(outDir, "sw.js"), "// sw", "utf8");
      await fs.writeFile(path.join(outDir, "bundle.js.map"), "{}", "utf8");
      await fs.writeFile(path.join(outDir, "bundle.JS.MAP"), "{}", "utf8");
      await fs.writeFile(
        path.join(outDir, "nested", "sw.js"),
        "// nested sw",
        "utf8",
      );
      await fs.writeFile(
        path.join(outDir, "nested", "app.js"),
        "console.log('app');",
        "utf8",
      );
      await fs.writeFile(
        path.join(outDir, "nested", "deep", "style.css"),
        "body {}",
        "utf8",
      );

      const assets = await collectPrecacheAssets(outDir);

      expect(assets).toEqual([
        "/",
        "/index.html",
        "/nested/app.js",
        "/nested/deep/style.css",
      ]);
    });

    it("does not add / when index.html is not present", async () => {
      const outDir = path.join(tempBaseDir, "no-index");
      await fs.mkdir(outDir, { recursive: true });

      await fs.writeFile(
        path.join(outDir, "about.html"),
        "<h1>About</h1>",
        "utf8",
      );
      await fs.writeFile(
        path.join(outDir, "main.js"),
        "console.log(1);",
        "utf8",
      );

      const assets = await collectPrecacheAssets(outDir);

      expect(assets).toEqual(["/about.html", "/main.js"]);
      expect(assets.includes("/")).toBe(false);
    });

    it("sorts collected assets alphabetically", async () => {
      const outDir = path.join(tempBaseDir, "sorting");
      await fs.mkdir(outDir, { recursive: true });

      await fs.writeFile(path.join(outDir, "z.txt"), "z", "utf8");
      await fs.writeFile(path.join(outDir, "a.txt"), "a", "utf8");
      await fs.writeFile(path.join(outDir, "m.txt"), "m", "utf8");

      const assets = await collectPrecacheAssets(outDir);

      expect(assets).toEqual(["/a.txt", "/m.txt", "/z.txt"]);
    });

    it("ignores non-directory, non-file entries such as symlinks to non-files", async () => {
      const outDir = path.join(tempBaseDir, "symlink-dir");
      await fs.mkdir(outDir, { recursive: true });

      await fs.writeFile(path.join(outDir, "file.txt"), "content", "utf8");

      const targetDir = path.join(tempBaseDir, "target-dir");
      await fs.mkdir(targetDir, { recursive: true });
      await fs.symlink(targetDir, path.join(outDir, "symlinked-dir"));

      const assets = await collectPrecacheAssets(outDir);
      expect(assets).toEqual(["/file.txt"]);
    });
  });

  describe("computeCacheHash", () => {
    it("computes a deterministic 12-character sha256 hash", async () => {
      const outDir = path.join(tempBaseDir, "hash-test");
      await fs.mkdir(outDir, { recursive: true });

      const fileContent = "console.log('hash test');";
      await fs.writeFile(path.join(outDir, "app.js"), fileContent, "utf8");

      const assetPaths = ["/", "/app.js"];
      const hash = await computeCacheHash(outDir, assetPaths);

      expect(hash.length).toBe(12);
      expect(hash).toMatch(/^[0-9a-f]{12}$/);

      const expectedHasher = crypto.createHash("sha256");
      expectedHasher.update("/app.js");
      expectedHasher.update(Buffer.from(fileContent));
      const expectedHash = expectedHasher.digest("hex").slice(0, 12);

      expect(hash).toBe(expectedHash);
    });

    it("skips / and skips asset paths that do not exist on disk", async () => {
      const outDir = path.join(tempBaseDir, "hash-missing");
      await fs.mkdir(outDir, { recursive: true });

      const fileContent = "index content";
      await fs.writeFile(path.join(outDir, "index.html"), fileContent, "utf8");

      const hashWithMissing = await computeCacheHash(outDir, [
        "/",
        "/index.html",
        "/does-not-exist.png",
      ]);

      const hashWithoutMissing = await computeCacheHash(outDir, [
        "/",
        "/index.html",
      ]);

      expect(hashWithMissing).toBe(hashWithoutMissing);
    });

    it("produces different hashes when content or asset paths change", async () => {
      const outDir1 = path.join(tempBaseDir, "hash-v1");
      const outDir2 = path.join(tempBaseDir, "hash-v2");
      await fs.mkdir(outDir1, { recursive: true });
      await fs.mkdir(outDir2, { recursive: true });

      await fs.writeFile(path.join(outDir1, "data.json"), '{"v":1}', "utf8");
      await fs.writeFile(path.join(outDir2, "data.json"), '{"v":2}', "utf8");

      const hash1 = await computeCacheHash(outDir1, ["/data.json"]);
      const hash2 = await computeCacheHash(outDir2, ["/data.json"]);

      expect(hash1).not.toBe(hash2);
    });

    it("correctly hashes nested asset paths whether or not they have a leading slash", async () => {
      const outDir = path.join(tempBaseDir, "nested-hash");
      const nestedDir = path.join(outDir, "nested", "deep");
      await fs.mkdir(nestedDir, { recursive: true });

      const content = "export const value = 42;";
      await fs.writeFile(path.join(nestedDir, "style.css"), content, "utf8");

      const hashWithSlash = await computeCacheHash(outDir, [
        "/nested/deep/style.css",
      ]);
      const hashWithoutSlash = await computeCacheHash(outDir, [
        "nested/deep/style.css",
      ]);

      expect(hashWithSlash).not.toBe(hashWithoutSlash);

      const expectedHasher = crypto.createHash("sha256");
      expectedHasher.update("nested/deep/style.css");
      expectedHasher.update(Buffer.from(content));
      const expectedHash = expectedHasher.digest("hex").slice(0, 12);

      expect(hashWithoutSlash).toBe(expectedHash);
    });
  });

  describe("generateServiceWorkerCode", () => {
    it("generates service worker code matching the exact template", () => {
      const code = generateServiceWorkerCode(
        "my-prefix",
        "my-prefix-abcd1234ef56",
        ["/", "/index.html"],
      );

      const expectedAssets = `  "/",\n  "/index.html",`;
      expect(code).toContain('const CACHE_PREFIX = "my-prefix";');
      expect(code).toContain('const CACHE_NAME = "my-prefix-abcd1234ef56";');
      expect(code).toContain(
        `const PRECACHE_ASSETS = [\n${expectedAssets}\n];`,
      );
      expect(code).toContain('self.addEventListener("install",');
      expect(code).toContain('self.addEventListener("activate",');
      expect(code).toContain('self.addEventListener("message",');
      expect(code).toContain('self.addEventListener("fetch",');
      expect(code).toContain('request.mode === "navigate"');
      expect(code).toContain("url.origin === self.location.origin");
      expect(code).toContain('event.data?.type === "SKIP_WAITING"');
      expect(code).toContain(
        "key.startsWith(`$" + "{CACHE_PREFIX}-`) && key !== CACHE_NAME",
      );
      expect(code).toContain('cache.match("/404.html")');
      expect(code).not.toContain("clients.claim");

      // Valid JS syntax
      expect(() => new Function(code)).not.toThrow();
    });

    it("handles an empty precache assets array", () => {
      const code = generateServiceWorkerCode("prefix", "prefix-hash", []);
      expect(code).toContain("const PRECACHE_ASSETS = [\n\n];");
      expect(() => new Function(code)).not.toThrow();
    });
  });

  describe("generateServiceWorker", () => {
    it("generates service worker result and writes files when writeFiles is true", async () => {
      const outDir = path.join(tempBaseDir, "dist");
      const publicDir = path.join(tempBaseDir, "public");
      await fs.mkdir(outDir, { recursive: true });
      await fs.mkdir(publicDir, { recursive: true });

      await fs.writeFile(
        path.join(outDir, "index.html"),
        "<h1>Home</h1>",
        "utf8",
      );

      const result = await generateServiceWorker({
        outDir,
        publicDir,
        cachePrefix: "test-app",
        writeFiles: true,
      });

      expect(result.cacheName).toBe(`test-app-${result.hash}`);
      expect(result.hash.length).toBe(12);
      expect(result.assets).toEqual(["/", "/index.html"]);
      expect(result.outputPath).toBe(path.join(path.resolve(outDir), "sw.js"));
      expect(result.publicPath).toBe(
        path.join(path.resolve(publicDir), "sw.js"),
      );

      const outContent = await fs.readFile(result.outputPath, "utf8");
      const publicContent = await fs.readFile(result.publicPath, "utf8");

      expect(outContent).toBe(result.code);
      expect(publicContent).toBe(result.code);
    });

    it("does not write files to disk when writeFiles is false", async () => {
      const outDir = path.join(tempBaseDir, "dist-nowrite");
      const publicDir = path.join(tempBaseDir, "public-nowrite");
      await fs.mkdir(outDir, { recursive: true });
      await fs.mkdir(publicDir, { recursive: true });

      await fs.writeFile(
        path.join(outDir, "index.html"),
        "<h1>Home</h1>",
        "utf8",
      );

      const result = await generateServiceWorker({
        outDir,
        publicDir,
        cachePrefix: "test-app",
        writeFiles: false,
      });

      expect(result.assets).toEqual(["/", "/index.html"]);

      await expect(fs.access(result.outputPath)).rejects.toThrow();
      await expect(fs.access(result.publicPath)).rejects.toThrow();
    });

    it("writes to outDir but skips publicDir if publicDir does not exist", async () => {
      const outDir = path.join(tempBaseDir, "dist-only");
      const publicDir = path.join(tempBaseDir, "missing-public");
      await fs.mkdir(outDir, { recursive: true });

      await fs.writeFile(
        path.join(outDir, "index.html"),
        "<h1>Home</h1>",
        "utf8",
      );

      const result = await generateServiceWorker({
        outDir,
        publicDir,
        cachePrefix: "test-app",
        writeFiles: true,
      });

      const outContent = await fs.readFile(result.outputPath, "utf8");
      expect(outContent).toBe(result.code);

      await expect(fs.access(result.publicPath)).rejects.toThrow();
    });
  });

  describe("calculateDefaultSwOptions and DEFAULT_SW_OPTIONS", () => {
    it("returns correct options from an AppConfig", () => {
      const customConfig: AppConfig = {
        output: "export",
        distDir: "build-output",
      };

      const options = calculateDefaultSwOptions(customConfig);

      expect(options).toEqual({
        outDir: "build-output",
        publicDir: "public",
        cachePrefix: "chapter0",
        writeFiles: true,
      });
    });

    it("matches DEFAULT_SW_OPTIONS calculated with nextConfig", () => {
      expect(DEFAULT_SW_OPTIONS).toEqual({
        outDir: nextConfig.distDir,
        publicDir: "public",
        cachePrefix: "chapter0",
        writeFiles: true,
      });
    });
  });

  describe("runCli", () => {
    it("runs generateServiceWorker and logs the result to console.log", async () => {
      const outDir = path.join(tempBaseDir, "cli-out");
      const publicDir = path.join(tempBaseDir, "cli-public");
      await fs.mkdir(outDir, { recursive: true });
      await fs.mkdir(publicDir, { recursive: true });

      await fs.writeFile(
        path.join(outDir, "index.html"),
        "<h1>Home</h1>",
        "utf8",
      );

      const options = {
        outDir,
        publicDir,
        cachePrefix: "cli-prefix",
        writeFiles: true,
      };

      const originalLog = console.log;
      const loggedMessages: string[] = [];
      console.log = (...args: unknown[]) => {
        loggedMessages.push(args.map(String).join(" "));
        originalLog(...args);
      };

      try {
        const result = await runCli(options);
        expect(result.cacheName).toBe(`cli-prefix-${result.hash}`);
        expect(result.assets).toEqual(["/", "/index.html"]);

        const expectedLog = `[generate:sw] Generated service worker with ${result.assets.length} precached assets. Cache: ${result.cacheName}`;
        expect(loggedMessages).toContain(expectedLog);
      } finally {
        console.log = originalLog;
      }
    });
  });
});
