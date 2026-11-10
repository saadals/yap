import type { Metadata } from "next";

import { ServicePage } from "@/components/marketing/service-page";

export const metadata: Metadata = {
  title: "Go to market",
  description: "A launch wave on Yapp: ten or more creators on one brief, with an upload deadline you set and a 14-day window.",
};

export default function GoToMarketPage() {
  return <ServicePage slug="go-to-market" />;
}
