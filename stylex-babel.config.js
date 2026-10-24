export function getStyleXOptions({
  dev = false,
  test = false,
  rootDir = process.cwd(),
} = {}) {
  return {
    dev,
    test,
    runtimeInjection: false,
    genConditionalClasses: true,
    treeshakeCompensation: true,
    unstable_moduleResolution: {
      type: "commonJS",
      rootDir,
    },
  };
}
