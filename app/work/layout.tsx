import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Everything in flight on Yapp: videos you ordered and videos you're making, with the one thing that needs you first.",
};

export default function WorkLayout({ children }: { children: React.ReactNode }) {
  return children;
}
