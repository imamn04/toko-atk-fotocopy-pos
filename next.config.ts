import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Lewati type-check saat build di server/container VPS agar hemat RAM hingga 60% (mencegah OOM Crash)
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
