import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orders",
  description: "Your orders: UGC campaigns and custom orders. Compare pitches, review videos and place new orders.",
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
