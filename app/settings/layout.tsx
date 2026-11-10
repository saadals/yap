import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Your details, business account, the brand accounts creators tag, team, notifications and how you take on work.",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
