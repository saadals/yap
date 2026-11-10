import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Productivity",
  description:
    "How your work on Yapp is going, as a brand or as a creator: spend or earnings, videos, timing, and the people you worked with.",
};

export default function ProductivityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
