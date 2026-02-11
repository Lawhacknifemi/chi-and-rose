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
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${process.env.NEXT_PUBLIC_SERVER_URL}/api/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
