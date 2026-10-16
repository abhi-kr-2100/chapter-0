# Chapter 0 — Agent Context

**Chapter 0** is a local-first in-browser document reader.

## Architecture at a Glance

* **Runtime:** Hosted PWA, 100% offline via Service Workers.
* **Storage:**
  * **OPFS:** Raw `.epub`/`.pdf` binaries streamed via Web Workers (`createSyncAccessHandle()`).
  * **IndexedDB:** Metadata, library catalogs, reading positions (CFI/pages), and annotations.
* **Threading:** Main thread strictly for UI and gestures; Web Workers for parsing, ZIP decompression, PDF rasterization, and search indexing.
* **OS Integration:** File Handling API (`launchQueue`), Web Share Target, and Storage Persistence API.

👉 **Full Architecture Specification:** See **[architecture.html](./architecture.html)** for component diagrams, storage hierarchies, and worker implementations.
