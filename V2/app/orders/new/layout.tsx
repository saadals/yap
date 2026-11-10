import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New order",
  description: "Order videos: pick a creator, get pitches, or run a UGC campaign.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
