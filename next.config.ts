import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // geotiff (SoilGrids map reader) runs as plain Node code, not bundled
  serverExternalPackages: ["geotiff"],
  // the farm data page moved; old links (and the desktop app menu) keep working
  async redirects() {
    return [{ source: "/register", destination: "/datos", permanent: true }];
  },
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
