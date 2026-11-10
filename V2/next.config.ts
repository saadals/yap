import path from "node:path";

import type { NextConfig } from "next";

/**
 * Yapp V2. Same two build modes as V1:
 * - default (`npm run dev` / `npm run build`): a normal Next.js app.
 * - GitHub Pages (`npm run build:pages`): `GITHUB_PAGES=true` turns on a static export into `out/`,
 *   served under NEXT_PUBLIC_BASE_PATH ("/yap/V2" on GitHub Pages, next to V1 at "/yap").
 *
 * V2 has no node_modules of its own: packages resolve from the repo root, so Turbopack's root is
 * the parent folder (otherwise it refuses to read files outside V2/).
 */
const pages = process.env.GITHUB_PAGES === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const repoRoot = path.resolve(process.cwd(), "..");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
  ...(pages
    ? {
        output: "export",
        basePath: basePath || undefined,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
