import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Native posts",
  description: "Your product, posted by creators people follow.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
