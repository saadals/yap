import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get started",
  description: "Set up your account to order or make videos.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
