import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set up your account",
  description: "A few quick steps to set up your Yapp workspace or creator profile.",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
