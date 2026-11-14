import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} · Alto Valle`,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#f3f7f4",
    theme_color: "#047857",
    lang: "es-AR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
