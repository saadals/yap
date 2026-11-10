import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find work",
  description: "Open custom orders to pitch on and UGC campaigns to pick from.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
