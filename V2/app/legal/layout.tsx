import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal",
  description: "Terms and policies.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
