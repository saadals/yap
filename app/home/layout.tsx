import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
  description: "Your feed: creators' videos to order from, and orders to pitch on or accept, one reel at a time.",
  // The feed is the phone's home; "/" is the canonical page (Site-wide 5.1.2).
  robots: { index: false },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
