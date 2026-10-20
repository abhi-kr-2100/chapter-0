# Chapter 0 — Agent Context

Chapter 0 is a local-first in-browser document reader.

## Architecture at a Glance

* Runtime: Hosted PWA, 100% offline via Service Workers.
* Delivery: SSG (static site).
* Storage:
  * OPFS: Raw `.epub`/`.pdf` binaries streamed via Web Workers.
  * IndexedDB: Metadata, library catalogs, reading positions (CFI/pages), and annotations.
* Threading: Main thread strictly for UI and gestures; Web Workers for parsing, ZIP decompression, PDF rasterization, and search indexing.
* OS Integration: File Handling API, Web Share Target, and Storage Persistence API.

## Coding Guidelines

* Do not ever use CSS. Use StyleX.

## Verification

* Format: `bun run format`
* Lint: `bun run check` and `bun run check:write`
