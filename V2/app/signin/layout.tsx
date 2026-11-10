import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create an account.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
