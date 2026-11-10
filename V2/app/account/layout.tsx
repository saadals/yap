import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account",
  description: "Your account, the mode switch and demo tools.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
