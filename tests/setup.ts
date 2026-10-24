import * as babel from "@babel/core";
import { plugin } from "bun";
import { GlobalWindow } from "happy-dom";
import { getStyleXOptions } from "../stylex-babel.config.js";

const win = new GlobalWindow({ url: "http://localhost" });
Object.assign(globalThis, {
  window: win,
  document: win.document,
  HTMLElement: win.HTMLElement,
  HTMLButtonElement: win.HTMLButtonElement,
  Node: win.Node,
  Element: win.Element,
  Event: win.Event,
  MouseEvent: win.MouseEvent,
  KeyboardEvent: win.KeyboardEvent,
  FocusEvent: win.FocusEvent,
  customElements: win.customElements,
});

plugin({
  name: "stylex-bun-plugin",
  setup(build) {
    build.onLoad({ filter: /src\/.*\.(tsx|ts)$/ }, async (args) => {
      const file = Bun.file(args.path);
      const text = await file.text();
      const loader = args.path.endsWith(".tsx") ? "tsx" : "ts";
      if (
        !text.includes("@stylexjs/stylex") &&
        !args.path.includes("tokens.stylex")
      ) {
        return { contents: text, loader };
      }

      const result = await babel.transformAsync(text, {
        filename: args.path,
        configFile: false,
        babelrc: false,
        presets: [
          "@babel/preset-typescript",
          ["@babel/preset-react", { runtime: "automatic" }],
        ],
        plugins: [
          [
            "@stylexjs/babel-plugin",
            getStyleXOptions({
              dev: true,
              test: true,
            }),
          ],
        ],
      });

      return {
        contents: result?.code ?? text,
        loader: "tsx",
      };
    });
  },
});
