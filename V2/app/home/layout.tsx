import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
  description: "What needs you, what's in progress, and creators who fit your products.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
