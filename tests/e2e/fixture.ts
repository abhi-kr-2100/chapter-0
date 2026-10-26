import path from "node:path";
import { type Browser, type BrowserContext, chromium } from "playwright-core";
import nextConfig from "../../next.config";

export const OUT_DIR = path.resolve(nextConfig.distDir);

export function getBrowserPath(): string {
  const envPath = process.env.CHROMIUM_PATH;
  if (envPath) {
    return envPath;
  }
  throw new Error("Chromium binary not found.");
}

export interface StaticServerInstance {
  baseUrl: string;
  stop: () => void;
}

export function createE2EServer(
  outDir: string = OUT_DIR,
): StaticServerInstance {
  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      const pathname = new URL(req.url).pathname;
      const target = pathname.endsWith("/")
        ? `${pathname}index.html`
        : pathname;
      const file = Bun.file(path.join(outDir, target));
      if (await file.exists()) {
        return new Response(file);
      }
      const notFoundFile = Bun.file(path.join(outDir, "404.html"));
      if (await notFoundFile.exists()) {
        return new Response(notFoundFile, { status: 404 });
      }
      return new Response("Not Found", { status: 404 });
    },
  });

  return {
    baseUrl: server.url.origin,
    stop() {
      server.stop(true);
    },
  };
}

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  close: () => Promise<void>;
}

export async function createBrowserSession(): Promise<BrowserSession> {
  const browser = await chromium.launch({
    executablePath: getBrowserPath(),
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext();

  return {
    browser,
    context,
    async close() {
      await context.close();
      await browser.close();
    },
  };
}
