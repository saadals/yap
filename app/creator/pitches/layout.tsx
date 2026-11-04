import type { Metadata } from "next";

export const metadata: Metadata = { title: "My pitches" };

export default function PitchesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
