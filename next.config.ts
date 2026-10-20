import type { NextConfig } from "next";

export interface AppConfig extends NextConfig {
  output: "export";
  distDir: string;
}

export const nextConfig: AppConfig = {
  output: "export",
  distDir: "out",
};

export default nextConfig;
