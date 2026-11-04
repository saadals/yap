import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For creators",
  description:
    "Get paid to make selfie demos, walkthroughs and honest reviews for apps. Payment is secured before you start, and you keep 100% of your price.",
};

export default function ForCreatorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
