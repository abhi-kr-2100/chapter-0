import styleXPlugin, { type Options } from "@stylexjs/babel-plugin";

export const stylexOptions: Partial<Options> = {
  dev: process.env.NODE_ENV !== "production",
  runtimeInjection: false,
  treeshakeCompensation: true,
  unstable_moduleResolution: {
    type: "commonJS",
    rootDir: import.meta.dirname,
  },
};

export const stylexPluginItem = [styleXPlugin, stylexOptions] as const;
