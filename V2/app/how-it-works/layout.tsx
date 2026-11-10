import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How it works",
  description: "How ordering on Yapp works, and how payment is protected.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
