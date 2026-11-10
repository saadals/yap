import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UGC ads",
  description: "Creator videos made to run as ads.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
