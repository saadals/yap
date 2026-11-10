import { Suspense } from "react";

import { FeedSkeleton, ReelFeed } from "@/components/feed/reel-feed";
import { AppShell } from "@/components/shell/app-shell";
import { PhoneOnly } from "@/components/shell/home-route";

/** Home: the reels feed, phones only (round 3 answers, item 59). On desktop "/home" goes to "/". */
export default function HomePage() {
  return (
    <PhoneOnly>
      <AppShell fullscreen>
        <Suspense fallback={<FeedSkeleton />}>
          <ReelFeed />
        </Suspense>
      </AppShell>
    </PhoneOnly>
  );
}
