import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New order",
  description: "Order videos or ad copy: pick a creator, post a custom order, or run a UGC campaign.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
