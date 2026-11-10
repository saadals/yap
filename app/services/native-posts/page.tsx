import type { Metadata } from "next";

import { ServicePage } from "@/components/marketing/service-page";

export const metadata: Metadata = {
  title: "Native posts",
  description: "A UGC campaign where ten or more creators post your product on their own accounts, verified and kept up for 30 days.",
};

export default function NativePostsPage() {
  return <ServicePage slug="native-posts" />;
}
