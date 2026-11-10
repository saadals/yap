import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products",
  description: "Saved product context that every brief reuses.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
