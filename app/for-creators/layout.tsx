import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For creators",
  description:
    "Get paid to make app demos, unboxings and testimonials for tech brands, or take UGC campaign slots at a price the brand sets. You see what you earn beside every price.",
};

export default function ForCreatorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
