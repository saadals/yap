import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages",
  description: "Messages and alerts.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
