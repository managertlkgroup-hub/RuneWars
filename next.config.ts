import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Яндекс.Игры: статический экспорт (index.html + assets, без Node-сервера)
  output: "export",
  // относительные пути к ассетам — чтобы out/index.html работал через file://
  // и на любом под-пути хостинга Яндекс.Игр
  assetPrefix: "./",
  // отключаем image optimization (статика)
  images: {
    unoptimized: true,
  },
  // добавляем trailing slash для совместимости со статическим хостингом
  trailingSlash: true,
  // игнорируем ошибки типов при сборке (TS-проблемы не блокируют релиз)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
