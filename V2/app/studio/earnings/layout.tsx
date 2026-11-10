import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Earnings",
  description: "Available, pending and paid out.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
