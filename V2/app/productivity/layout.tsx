import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Productivity",
  description: "Figures the platform can compute: spending and results, or earnings and pitching.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
