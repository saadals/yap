import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit profile",
  description: "Your portfolio, packages, add-ons, availability and connected accounts.",
};

export default function EditProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
