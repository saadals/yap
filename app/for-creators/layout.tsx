import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For creators",
  description:
    "Get paid to make app demos, unboxings and testimonials for tech brands, or take UGC campaign slots at a fixed price per video. Keep 100% of your price.",
};

export default function ForCreatorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
