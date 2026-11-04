import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find creators",
  description:
    "Browse ID-verified creators who make selfie demos, walkthroughs, honest reviews and skits for apps, in Saudi, Khaleeji, Egyptian, Levantine and more.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
