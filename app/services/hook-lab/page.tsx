import type { Metadata } from "next";

import { ServicePage } from "@/components/marketing/service-page";

export const metadata: Metadata = {
  title: "Hook Lab",
  description: "Ad hook packs: several openings filmed for one ad body, and alternate hooks added to any video, ready to test.",
};

export default function HookLabPage() {
  return <ServicePage slug="hook-lab" />;
}
