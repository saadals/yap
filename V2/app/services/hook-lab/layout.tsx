import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hook Lab",
  description: "Several openings for one ad, filmed by one creator, ready to test.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
