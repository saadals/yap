import type { MetadataRoute } from "next";

import { asset, basePath } from "@/lib/site";

// Static: generated once at build time, so it also works in the GitHub Pages export.
export const dynamic = "force-static";

/** Web app manifest. Icons are the brand package's opaque app icons, served from public/. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yapp",
    short_name: "Yapp",
    description: "Short videos from real creators, made for tech brands.",
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: "standalone",
    background_color: "#F7F7F9",
    theme_color: "#F7F7F9",
    icons: [
      { src: asset("/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: asset("/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
  };
}
