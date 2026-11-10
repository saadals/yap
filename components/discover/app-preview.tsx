"use client";

import { Suspense, useEffect, useRef, useState } from "react";

import { FeedSkeleton, ReelFeed } from "@/components/feed/reel-feed";
import { BottomBar } from "@/components/shell/app-shell";
import { paths } from "@/lib/paths";

/**
 * Controls that still work in the preview (Discover 4.5.1): the feed's own Mix / Yapps / Orders
 * tabs, play and pause, and the details layer's way back. Scrolling, swiping a post for its details
 * and the keyboard aren't clicks, so they work anyway.
 */
const ALLOWED = ".y-reel-tabs, .y-details-back, .y-reel-play";
const CONTROL = "a[href], button, [role='button'], [role='tab'], [role='menuitem'], input, select, textarea, label, summary";
const NOTE_MS = 1600;

/**
 * The phone app's Home feed, read-only, for the frame in Discover's "Get the app" (route
 * `/app-preview`). The store runs in preview mode (lib/preview.ts): the seed in memory, no storage,
 * no cookies, every action refused. On top of that, a tap on anything that would change something
 * or leave the feed (ordering, pitching, a profile, "+", the menu, the other tabs) is stopped and
 * a small note says it's in the app. No sign-in, sign-out, welcome or account sheet is reachable.
 */
export function AppPreview() {
  const [note, setNote] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const refuse = (event: React.SyntheticEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    const control = target?.closest(CONTROL);
    if (!control || control.closest(ALLOWED)) return;
    event.preventDefault();
    event.stopPropagation();
    setNote(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNote(false), NOTE_MS);
  };

  return (
    <div
      className="y-appview"
      onClickCapture={refuse}
      onAuxClickCapture={refuse}
      onSubmitCapture={(event) => event.preventDefault()}
    >
      <main id="main" className="y-appview-main">
        <Suspense fallback={<FeedSkeleton />}>
          <ReelFeed />
        </Suspense>
      </main>
      <BottomBar current={paths.home} />
      <p className="y-appview-note" role="status" aria-live="polite" data-on={note ? "true" : undefined}>
        {note ? "Available in the Yapp app" : ""}
      </p>
    </div>
  );
}
