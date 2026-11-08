import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing & receipts",
  description: "What's held right now, receipts for every order and campaign, and how you pay.",
};

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
