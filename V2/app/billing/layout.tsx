import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing",
  description: "Receipts, payment methods and money held for your orders.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
