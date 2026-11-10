import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Go to market",
  description: "Ten or more creators on one launch brief, posting on their own accounts.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
