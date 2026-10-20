import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { type BrowserContext, chromium, type Page } from "playwright-core";
import { assertBuildSuccess, ensureBuild } from "../fixtures/build";
import {
  CHROMIUM_ARGS,
  createStaticServer,
  getChromiumPath,
  teardownE2EFixture,
} from "../fixtures/e2e";

describe("Build Fixture Helpers", () => {
  it("succeeds when build exitCode is 0", () => {
    expect(() => assertBuildSuccess({ exitCode: 0 })).not.toThrow();
  });

  it("throws when build exitCode is non-zero", () => {
    expect(() => assertBuildSuccess({ exitCode: 1 })).toThrow(
      "Build failed with exit code 1",
    );
  });

  it("returns early when build has already completed", () => {
    expect(() => ensureBuild(false)).not.toThrow();
  });
});

describe("E2E Fixture Helpers", () => {
  it("resolves chromium path in current environment", () => {
    const path = getChromiumPath();
    expect(path).toBeDefined();
    expect(typeof path).toBe("string");
  });

  it("throws error when chromium binary is not found", () => {
    expect(() => getChromiumPath({ PATH: "" })).toThrow(
      "Chromium binary not found. Set CHROMIUM_PATH or ensure chromium is in PATH via flake devShell.",
    );
  });

  it("returns 404 response for non-existent routes in static server", async () => {
    const server = createStaticServer();
    try {
      const response = await fetch(
        `http://localhost:${server.port}/non-existent-route.xyz`,
      );
      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Not Found");
    } finally {
      server.stop();
    }
  });

  describe("teardownE2EFixture", () => {
    it("handles empty fixture without errors", async () => {
      await expect(teardownE2EFixture({})).resolves.toBeUndefined();
    });

    it("ignores non-existent temporary directory", async () => {
      await expect(
        teardownE2EFixture({
          tmpDir: path.join(
            os.tmpdir(),
            "chapter0-non-existent-test-dir-12345",
          ),
        }),
      ).resolves.toBeUndefined();
    });

    it("tears down all real resources cleanly in standard mode", async () => {
      const server = createStaticServer();
      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "chapter0-test-teardown-"),
      );
      const browser = await chromium.launch({
        executablePath: getChromiumPath(),
        headless: true,
        args: CHROMIUM_ARGS,
      });
      const context = await browser.newContext();
      const page = await context.newPage();

      await teardownE2EFixture({
        server,
        tmpDir,
        browser,
        context,
        page,
      });

      expect(page.isClosed()).toBe(true);
      expect(browser.isConnected()).toBe(false);
      expect(fs.existsSync(tmpDir)).toBe(false);
    });

    it("cleans up remaining resources when page.close() rejects", async () => {
      const server = createStaticServer();
      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "chapter0-test-teardown-"),
      );
      const browser = await chromium.launch({
        executablePath: getChromiumPath(),
        headless: true,
        args: CHROMIUM_ARGS,
      });
      const context = await browser.newContext();

      const failingPage = {
        close: async () => {
          throw new Error("Target page closed unexpectedly");
        },
      } as unknown as Page;

      let caughtError: unknown;
      try {
        await teardownE2EFixture({
          server,
          tmpDir,
          browser,
          context,
          page: failingPage,
        });
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(Error);
      expect((caughtError as Error).message).toBe(
        "Target page closed unexpectedly",
      );
      expect(browser.isConnected()).toBe(false);
      expect(fs.existsSync(tmpDir)).toBe(false);
    });

    it("aggregates multiple errors when multiple steps fail and cleans up others", async () => {
      const server = createStaticServer();
      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "chapter0-test-teardown-"),
      );

      const failingPage = {
        close: async () => {
          throw new Error("Page teardown failure");
        },
      } as unknown as Page;

      const failingContext = {
        close: async () => {
          throw new Error("Context teardown failure");
        },
      } as unknown as BrowserContext;

      let caughtError: unknown;
      try {
        await teardownE2EFixture({
          server,
          tmpDir,
          page: failingPage,
          context: failingContext,
        });
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(AggregateError);
      const aggregate = caughtError as AggregateError;
      expect(aggregate.errors).toHaveLength(2);
      expect((aggregate.errors[0] as Error).message).toBe(
        "Page teardown failure",
      );
      expect((aggregate.errors[1] as Error).message).toBe(
        "Context teardown failure",
      );
      expect(fs.existsSync(tmpDir)).toBe(false);
    });

    it("does not close page directly when persistent is true", async () => {
      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "chapter0-test-teardown-"),
      );
      const context = await chromium.launchPersistentContext(tmpDir, {
        executablePath: getChromiumPath(),
        headless: true,
        args: CHROMIUM_ARGS,
      });
      const page = context.pages()[0] ?? (await context.newPage());
      const server = createStaticServer();

      await teardownE2EFixture(
        {
          server,
          tmpDir,
          context,
          page,
        },
        { persistent: true },
      );

      expect(page.isClosed()).toBe(true);
      expect(fs.existsSync(tmpDir)).toBe(false);
    });
  });
});
