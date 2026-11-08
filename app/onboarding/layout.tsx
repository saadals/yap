import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set up your account",
  description: "A few quick steps to start ordering videos, making them, or both, from one Yapp account.",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
