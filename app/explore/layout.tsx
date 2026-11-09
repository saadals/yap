import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discover",
  description: "Find creators to order videos from, or open orders to pitch on and take campaign slots in.",
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
