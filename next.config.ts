import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hanya aktifkan mode standalone di lingkungan Docker / VPS container
  ...(process.env.STANDALONE === "true" || process.env.NEXT_OUTPUT_STANDALONE === "1"
    ? { output: "standalone" }
    : {}),
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
