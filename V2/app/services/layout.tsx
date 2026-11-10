import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services",
  description: "What you can get made on Yapp.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
