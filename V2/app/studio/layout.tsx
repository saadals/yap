import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studio",
  description: "Your work as a creator: what needs you, money, and work that fits you.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
