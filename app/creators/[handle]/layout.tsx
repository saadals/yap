import { creatorHandles } from "@/lib/static-params";

/** Pre-renders known ids for the static export (GitHub Pages). See lib/static-params.ts. */
export function generateStaticParams() {
  return creatorHandles().map((handle) => ({ handle }));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
