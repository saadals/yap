import type { Metadata } from "next";

export const metadata: Metadata = { title: "Your profile" };

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
