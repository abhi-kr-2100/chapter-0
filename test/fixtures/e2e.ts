import { afterAll, beforeAll } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  type Browser,
  type BrowserContext,
  chromium,
  type Page,
} from "playwright-core";
import { ensureBuild } from "./build";

export const OUT_DIR = path.resolve("out");

export const CHROMIUM_ARGS = [
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
];

export function getChromiumPath(
  env: Record<string, string | undefined> = process.env,
): string {
  const browserPath =
    env.CHROMIUM_PATH ?? Bun.which("chromium", { PATH: env.PATH });

  if (!browserPath) {
    throw new Error(
      "Chromium binary not found. Set CHROMIUM_PATH or ensure chromium is in PATH via flake devShell.",
    );
  }

  return browserPath;
}

export function createStaticServer(outDir: string = OUT_DIR) {
  return Bun.serve({
    port: 0,
    async fetch(req) {
      let pathname = new URL(req.url).pathname;
      if (pathname === "/") pathname = "/index.html";

      const filePath = path.join(outDir, pathname);
      const file = Bun.file(filePath);

      if (await file.exists()) {
        const headers = new Headers();
        if (pathname.endsWith(".webmanifest")) {
          headers.set("content-type", "application/manifest+json");
        } else if (pathname.endsWith(".js")) {
          headers.set("content-type", "application/javascript");
        }
        return new Response(file, { headers });
      }
      return new Response("Not Found", { status: 404 });
    },
  });
}

export interface E2EFixtureOptions {
  persistent?: boolean;
  initialNavigation?: boolean;
  outDir?: string;
}

export interface E2EFixture {
  baseUrl: string;
  server: ReturnType<typeof Bun.serve>;
  browser?: Browser;
  context: BrowserContext;
  page: Page;
  tmpDir?: string;
}

export async function teardownE2EFixture(
  fixture: Partial<E2EFixture>,
  options: E2EFixtureOptions = {},
): Promise<void> {
  const tasks: Array<() => Promise<void> | void> = [];

  if (fixture.page && !options.persistent) {
    tasks.push(() => fixture.page?.close());
  }
  if (fixture.context) {
    tasks.push(() => fixture.context?.close());
  }
  if (fixture.browser) {
    tasks.push(() => fixture.browser?.close());
  }
  if (fixture.tmpDir && fs.existsSync(fixture.tmpDir)) {
    tasks.push(() => {
      fs.rmSync(fixture.tmpDir as string, { recursive: true, force: true });
    });
  }
  if (fixture.server) {
    tasks.push(() => fixture.server?.stop());
  }

  const errors: unknown[] = [];
  for (const task of tasks) {
    try {
      await task();
    } catch (error) {
      errors.push(error);
    }
  }

  if (errors.length === 1) {
    throw errors[0];
  }
  if (errors.length > 1) {
    throw new AggregateError(errors, "Teardown failed");
  }
}

export function setupE2EFixture(options: E2EFixtureOptions = {}): E2EFixture {
  const fixture = {} as E2EFixture;

  beforeAll(async () => {
    ensureBuild();
    fixture.server = createStaticServer(options.outDir);
    fixture.baseUrl = `http://localhost:${fixture.server.port}`;

    const executablePath = getChromiumPath();

    if (options.persistent) {
      fixture.tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "chapter0-pwa-e2e-"),
      );
      fixture.context = await chromium.launchPersistentContext(fixture.tmpDir, {
        executablePath,
        headless: true,
        args: CHROMIUM_ARGS,
      });
      fixture.page =
        fixture.context.pages()[0] ?? (await fixture.context.newPage());
    } else {
      fixture.browser = await chromium.launch({
        executablePath,
        headless: true,
        args: CHROMIUM_ARGS,
      });
      fixture.context = await fixture.browser.newContext();
      fixture.page = await fixture.context.newPage();
    }

    if (options.initialNavigation) {
      await fixture.page.goto(fixture.baseUrl);
    }
  }, 30000);

  afterAll(async () => {
    await teardownE2EFixture(fixture, options);
  });

  return fixture;
}
