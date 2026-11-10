import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jobs",
  description: "Your jobs and the pitches you sent.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
