import type { Metadata } from "next";

import { ServicePage } from "@/components/marketing/service-page";

export const metadata: Metadata = {
  title: "UGC ads",
  description: "Creator videos made to run as paid social ads: post a custom order, hire from the pitches, approve with payment held until then.",
};

export default function UgcAdsPage() {
  return <ServicePage slug="ugc-ads" />;
}
