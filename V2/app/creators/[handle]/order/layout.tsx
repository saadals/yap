import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order",
  description: "Order directly from a creator.",
};

/* Pre-rendered for every handle by the parent segment's generateStaticParams (app/creators/[handle]/layout.tsx). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
