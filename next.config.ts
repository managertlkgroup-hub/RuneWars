import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export включается только при явном вызове `bun run build`
  // Для превью/dev работает как обычный Next.js
  ...(process.env.BUILD_STATIC === "1"
    ? {
        output: "export" as const,
        assetPrefix: "./",
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
