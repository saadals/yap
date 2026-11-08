import { Suspense } from "react";

import { FeedSkeleton, ReelFeed } from "@/components/feed/reel-feed";
import { AppShell } from "@/components/shell/app-shell";

/** Home: the reels feed, filling the space between the header and the bottom bar. */
export default function HomePage() {
  return (
    <AppShell fullscreen>
      <Suspense fallback={<FeedSkeleton />}>
        <ReelFeed />
      </Suspense>
    </AppShell>
  );
}
