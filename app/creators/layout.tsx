import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find creators",
  description:
    "Browse ID-verified creators who make app demos, unboxings, testimonials and walkthroughs for tech brands, in English and seven more languages.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
