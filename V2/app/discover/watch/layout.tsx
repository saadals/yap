import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Watch",
  description: "Creators' videos, one at a time.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
