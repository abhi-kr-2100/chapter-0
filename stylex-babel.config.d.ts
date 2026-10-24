export interface StyleXOptions {
  dev: boolean;
  test: boolean;
  runtimeInjection: boolean;
  genConditionalClasses: boolean;
  treeshakeCompensation: boolean;
  unstable_moduleResolution: {
    type: "commonJS";
    rootDir: string;
  };
}

export interface GetStyleXOptionsParams {
  dev?: boolean;
  test?: boolean;
  rootDir?: string;
}

export declare function getStyleXOptions(
  options?: GetStyleXOptionsParams,
): StyleXOptions;
