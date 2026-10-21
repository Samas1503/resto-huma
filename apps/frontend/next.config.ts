import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev LAN: permite acceso desde el celular/red local
  allowedDevOrigins: ['192.168.1.78', '*.local'],
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
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
