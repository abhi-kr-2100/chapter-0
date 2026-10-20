# Chapter 0 — Agent Context

Chapter 0 is a local-first in-browser document reader.

## Architecture

* Framework: Next.js (App Router, static export).
* Runtime: Hosted PWA, 100% offline via Service Workers.
* Delivery: SSG (static site).
* Storage:
  * OPFS: Raw `.epub`/`.pdf` binaries streamed via Web Workers.
  * IndexedDB: Metadata, library catalogs, reading positions (CFI/pages), and annotations.
* Threading: Main thread strictly for UI and gestures; Web Workers for parsing, ZIP decompression, PDF rasterization, and search indexing.
* OS Integration: File Handling API, Web Share Target, and Storage Persistence API.

## Coding Guidelines

* Do not ever use CSS. Use StyleX.
* Use shadcn to download UI components, and modify them to use StyleX.
* Design code so that undefined, null, and fallback (using ?? or ||) are not required.
* Prefer high-level custom hooks over primitive React hooks.
* Testing:
   * Do not use mocks; test real implementations directly.
   * Maintain 100% line and branch coverage.
   * Write unit tests, integration tests, as well as E2E tests.

## Verification

* Format: `bun run format`
* Lint: `bun run check` and `bun run check:write`
