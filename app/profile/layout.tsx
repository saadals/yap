import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your Yapp profile, connected accounts and everything about your account.",
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
