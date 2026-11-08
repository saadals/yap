import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saved creators",
  description: "Creators you saved and creators you've worked with, ready to book again.",
};

export default function SavedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
