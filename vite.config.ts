import { resolve } from "node:path";
import angular from "@analogjs/vite-plugin-angular";
import stylex from "@stylexjs/unplugin";
import { defineConfig } from "vite";
import { syncSwPrecache } from "./plugins/sync-sw-precache.ts";

const stylexPlugin = stylex.vite({
	useCSSLayers: true,
});
stylexPlugin.enforce = "post";

export default defineConfig({
	plugins: [
		angular({
			tsconfig: "./tsconfig.app.json",
		}),
		stylexPlugin,
		syncSwPrecache({
			distDir: resolve(import.meta.dirname, "dist"),
		}),
	],
	build: {
		rollupOptions: {
			input: {
				main: resolve(import.meta.dirname, "index.html"),
				reader: resolve(import.meta.dirname, "reader/index.html"),
				offline: resolve(import.meta.dirname, "offline.html"),
			},
		},
	},
});
