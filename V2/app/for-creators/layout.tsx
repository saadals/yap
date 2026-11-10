import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For creators",
  description: "Make videos for tech brands and get paid.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
