import * as babel from "@babel/core";
import { plugin } from "bun";
import { stylexPluginItem } from "../stylex.config";

plugin({
  name: "stylex-transform",
  setup(build) {
    build.onLoad(
      { filter: /node_modules\/next\/font\/google\/index\.js$/ },
      () => {
        return {
          contents: `
export function Cantarell() {
  return { variable: "--font-cantarell" };
}
export function Petit_Formal_Script() {
  return { variable: "--font-petit" };
}
`,
          loader: "js",
        };
      },
    );

    build.onLoad({ filter: /\/src\/.*\.tsx?$/ }, async (args) => {
      const text = await Bun.file(args.path).text();
      if (!text.includes("@stylexjs/stylex")) {
        return {
          contents: text,
          loader: args.path.endsWith(".tsx") ? "tsx" : "ts",
        };
      }

      const transformed = await babel.transformAsync(text, {
        filename: args.path,
        configFile: false,
        babelrc: false,
        plugins: [
          ["@babel/plugin-syntax-typescript", { isTSX: true }],
          "@babel/plugin-syntax-jsx",
          stylexPluginItem,
        ],
      });

      return {
        contents: transformed?.code ?? text,
        loader: args.path.endsWith(".tsx") ? "tsx" : "ts",
      };
    });
  },
});
