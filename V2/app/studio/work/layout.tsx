import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find work",
  description: "Open briefs and campaigns you can pitch on or join.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
