import { afterEach, mock } from "bun:test";
import * as babel from "@babel/core";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { plugin } from "bun";
import { getStyleXOptions } from "../stylex-babel.config.js";

GlobalRegistrator.register({ url: "http://localhost" });

mock.module("next/font/google", () => ({
  Cantarell: (options: { variable: string }) => ({
    className: "font-cantarell",
    variable: options.variable,
  }),
  Petit_Formal_Script: (options: { variable: string }) => ({
    className: "font-petit",
    variable: options.variable,
  }),
}));

afterEach(async () => {
  const { cleanup } = await import("./test-utils");
  cleanup();
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
