import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Account, notifications and business details.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
