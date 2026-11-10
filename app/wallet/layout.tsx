import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wallet",
  description:
    "What you've earned making videos: available to withdraw, campaign pay pending until 7 days after a verified post, and payouts.",
};

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return children;
}
