import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New order",
  description: "Order videos: a UGC campaign for 10+ videos at a fixed price, or a custom request creators pitch on.",
};

export default function NewOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
