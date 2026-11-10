import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orders",
  description: "Everything you ordered, by stage.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
