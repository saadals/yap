import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What is Yapp?",
  description:
    "Yapp is where tech brands commission creators to make social videos for their own accounts and ads, with payment protected until they approve.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
