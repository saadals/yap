import type { Metadata } from "next";

import { DiscoverRoute } from "@/components/discover/discover-route";

export const metadata: Metadata = {
  title: "Discover",
  description: "Tech creators across the US & Canada, live briefs, results and reviews.",
};

/**
 * /discover: Discover for signed-out visitors and on phones. A signed-in desktop visitor whose home
 * is Discover is sent to "/", its one address there (round 3 answers, item 11).
 */
export default function DiscoverRoutePage() {
  return <DiscoverRoute />;
}
