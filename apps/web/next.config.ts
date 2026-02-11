import "@chi-and-rose/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: true,
  reactCompiler: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ["@chi-and-rose/api"],
};

export default nextConfig;
