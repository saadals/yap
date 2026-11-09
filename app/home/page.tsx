import { Suspense } from "react";

import { FeedSkeleton, ReelFeed } from "@/components/feed/reel-feed";
import { AppShell } from "@/components/shell/app-shell";

/** Home: the reels feed, full-bleed on phones and a 9:16 column under the header on desktop. */
export default function HomePage() {
  return (
    <AppShell fullscreen>
      <Suspense fallback={<FeedSkeleton />}>
        <ReelFeed />
      </Suspense>
    </AppShell>
  );
}
