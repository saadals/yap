import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For tech teams",
  description: "Social video for software teams.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
