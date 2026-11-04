import type { NextConfig } from "next";

/**
 * Two build modes:
 * - default (`npm run dev` / `npm run build`): a normal Next.js app.
 * - GitHub Pages (`npm run build:pages`, or the deploy workflow): `GITHUB_PAGES=true` turns on a
 *   fully static export into `out/`, served under NEXT_PUBLIC_BASE_PATH (e.g. "/yap").
 * Dynamic routes pre-render their ids via `generateStaticParams` in each segment's layout
 * (see lib/static-params.ts).
 */
const pages = process.env.GITHUB_PAGES === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
