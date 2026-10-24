import styleXPlugin from "@stylexjs/babel-plugin";
import { getStyleXOptions } from "./stylex-babel.config.js";

export default {
  presets: ["next/babel"],
  plugins: [
    [
      styleXPlugin,
      getStyleXOptions({
        dev: process.env.NODE_ENV !== "production",
        rootDir: import.meta.dirname,
      }),
    ],
  ],
};
