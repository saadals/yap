import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Library",
  description: "Every approved video for your products.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
