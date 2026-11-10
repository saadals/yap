import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My pitches",
  description: "Every pitch you've sent on custom orders, and where each one stands.",
};

export default function PitchesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
