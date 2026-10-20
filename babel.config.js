import styleXPlugin from "@stylexjs/babel-plugin";

export default {
  presets: ["next/babel"],
  plugins: [
    [
      styleXPlugin,
      {
        dev: process.env.NODE_ENV !== "production",
        runtimeInjection: false,
        genConditionalClasses: true,
        treeshakeCompensation: true,
        unstable_moduleResolution: {
          type: "commonJS",
          rootDir: import.meta.dirname,
        },
      },
    ],
  ],
};
