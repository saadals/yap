import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your profile",
  description: "Your portfolio, packages and details as brands see them.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
