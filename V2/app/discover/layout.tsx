import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discover",
  description: "Find creators by format, language and category.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
