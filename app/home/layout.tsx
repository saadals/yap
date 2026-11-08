import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
  description: "Your feed: creators' videos to order from, and orders to pitch on or accept, one reel at a time.",
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
