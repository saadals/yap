import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alerts",
  description: "New pitches, deliveries, comments and payments on your orders and your work.",
};

export default function AlertsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
