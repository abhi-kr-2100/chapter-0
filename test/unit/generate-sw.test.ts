import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import nextConfig from "../../next.config";
import {
  calculateDefaultSwOptions,
  collectPrecacheAssets,
  computeCacheHash,
  DEFAULT_SW_OPTIONS,
  generateServiceWorker,
  generateServiceWorkerCode,
  runCli,
} from "../../scripts/generate-sw";

describe("scripts/generate-sw", () => {
  it("throws when outDir does not exist", async () => {
    const nonExistent = path.join(os.tmpdir(), "non-existent-dir-12345");
    await expect(collectPrecacheAssets(nonExistent)).rejects.toThrow(
      "Output directory does not exist",
    );
  });

  it("collects assets, adds root slash, and excludes sw.js and .map", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-sw-assets-"));
    try {
      fs.writeFileSync(path.join(tmpDir, "index.html"), "<html></html>");
      fs.writeFileSync(path.join(tmpDir, "manifest.webmanifest"), "{}");
      fs.writeFileSync(path.join(tmpDir, "sw.js"), "// sw");
      fs.writeFileSync(path.join(tmpDir, "app.js.map"), "{}");

      const subDir = path.join(tmpDir, "static");
      fs.mkdirSync(subDir);
      fs.writeFileSync(path.join(subDir, "app.js"), "console.log(1);");

      const assets = await collectPrecacheAssets(tmpDir);

      expect(assets).toContain("/");
      expect(assets).toContain("/index.html");
      expect(assets).toContain("/manifest.webmanifest");
      expect(assets).toContain("/static/app.js");
      expect(assets).not.toContain("/sw.js");
      expect(assets).not.toContain("/app.js.map");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("does not add root slash if index.html is absent", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-sw-noindex-"));
    try {
      fs.writeFileSync(path.join(tmpDir, "about.html"), "<h1>About</h1>");
      const assets = await collectPrecacheAssets(tmpDir);
      expect(assets).toContain("/about.html");
      expect(assets).not.toContain("/");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("computes deterministic hash and changes when content changes", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-sw-hash-"));
    try {
      const file1 = path.join(tmpDir, "index.html");
      fs.writeFileSync(file1, "<h1>Hello</h1>");

      const hash1 = await computeCacheHash(tmpDir, ["/", "/index.html"]);
      const hash2 = await computeCacheHash(tmpDir, ["/", "/index.html"]);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(12);

      fs.writeFileSync(file1, "<h1>World</h1>");
      const hash3 = await computeCacheHash(tmpDir, ["/", "/index.html"]);
      expect(hash3).not.toBe(hash1);

      // Handles non-existent asset path gracefully
      const hash4 = await computeCacheHash(tmpDir, ["/missing.png"]);
      expect(typeof hash4).toBe("string");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("generates service worker code with cache name and precache assets", () => {
    const code = generateServiceWorkerCode("chapter0-123456789abc", [
      "/",
      "/index.html",
    ]);
    expect(code).toContain('const CACHE_NAME = "chapter0-123456789abc";');
    expect(code).toContain('"/index.html"');
    expect(code).toContain('"/ "'.replace(" ", ""));
    expect(code).toContain('self.addEventListener("install"');
    expect(code).toContain('self.addEventListener("activate"');
    expect(code).toContain('self.addEventListener("message"');
    expect(code).toContain('self.addEventListener("fetch"');
    expect(code).toContain("SKIP_WAITING");
    expect(code).toContain("self.clients.claim()");
    expect(code).toContain(
      "const cached = await cache.match(request, { ignoreSearch: true });",
    );
    expect(code).toContain('(await cache.match("/404.html"))');
  });

  it("generates service worker and writes to outDir and publicDir", async () => {
    const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), "test-sw-out-"));
    const tmpPublic = fs.mkdtempSync(path.join(os.tmpdir(), "test-sw-pub-"));
    try {
      fs.writeFileSync(path.join(tmpOut, "index.html"), "<h1>Test</h1>");

      const result = await generateServiceWorker({
        outDir: tmpOut,
        publicDir: tmpPublic,
        cachePrefix: "custom-prefix",
        writeFiles: true,
      });

      expect(result.cacheName.startsWith("custom-prefix-")).toBe(true);
      expect(result.assets).toContain("/");
      expect(result.assets).toContain("/index.html");
      expect(result.outputPath).toBeDefined();
      expect(result.publicPath).toBeDefined();

      if (result.outputPath && result.publicPath) {
        expect(fs.existsSync(result.outputPath)).toBe(true);
        expect(fs.existsSync(result.publicPath)).toBe(true);

        const outContent = fs.readFileSync(result.outputPath, "utf8");
        expect(outContent).toContain(result.cacheName);
      }
    } finally {
      fs.rmSync(tmpOut, { recursive: true, force: true });
      fs.rmSync(tmpPublic, { recursive: true, force: true });
    }
  });

  it("writes only to directories that exist when writeFiles is true", async () => {
    const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), "test-sw-partial-"));
    try {
      fs.writeFileSync(path.join(tmpOut, "index.html"), "<h1>Test</h1>");

      const result = await generateServiceWorker({
        outDir: tmpOut,
        publicDir: path.join(tmpOut, "missing-public"),
        cachePrefix: "chapter0",
        writeFiles: true,
      });

      expect(fs.existsSync(result.outputPath)).toBe(true);
      expect(fs.existsSync(result.publicPath)).toBe(false);
    } finally {
      fs.rmSync(tmpOut, { recursive: true, force: true });
    }
  });

  it("does not write files when writeFiles is false or directories do not exist", async () => {
    const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), "test-sw-nowrite-"));
    try {
      fs.writeFileSync(path.join(tmpOut, "index.html"), "<h1>Test</h1>");

      const result = await generateServiceWorker({
        outDir: tmpOut,
        publicDir: path.join(tmpOut, "non-existent-public"),
        cachePrefix: "custom-prefix",
        writeFiles: false,
      });

      expect(typeof result.outputPath).toBe("string");
      expect(typeof result.publicPath).toBe("string");
      expect(fs.existsSync(result.outputPath)).toBe(false);
      expect(fs.existsSync(result.publicPath)).toBe(false);
    } finally {
      fs.rmSync(tmpOut, { recursive: true, force: true });
    }
  });

  it("calculates DEFAULT_SW_OPTIONS from NextConfig and supports custom distDir", () => {
    const defaultOptions = calculateDefaultSwOptions(nextConfig);
    expect(DEFAULT_SW_OPTIONS).toEqual(defaultOptions);
    expect(DEFAULT_SW_OPTIONS.outDir).toBe("out");
    expect(DEFAULT_SW_OPTIONS.publicDir).toBe("public");
    expect(DEFAULT_SW_OPTIONS.cachePrefix).toBe("chapter0");
    expect(DEFAULT_SW_OPTIONS.writeFiles).toBe(true);

    const customOptions = calculateDefaultSwOptions({
      output: "export",
      distDir: "custom-export-dir",
    });
    expect(customOptions.outDir).toBe("custom-export-dir");
    expect(customOptions.publicDir).toBe("public");
    expect(customOptions.cachePrefix).toBe("chapter0");
    expect(customOptions.writeFiles).toBe(true);
  });

  it("executes runCli and outputs log message", async () => {
    const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), "test-sw-cli-"));
    const origLog = console.log;
    const logs: string[] = [];
    console.log = (msg: string) => logs.push(msg);
    try {
      fs.writeFileSync(path.join(tmpOut, "index.html"), "<h1>CLI</h1>");
      const result = await runCli({
        outDir: tmpOut,
        publicDir: path.join(tmpOut, "public"),
        cachePrefix: "chapter0",
        writeFiles: false,
      });

      expect(result).toBeDefined();
      expect(logs.length).toBe(1);
      expect(logs[0]).toContain("[generate:sw]");
    } finally {
      console.log = origLog;
      fs.rmSync(tmpOut, { recursive: true, force: true });
    }
  });
});
