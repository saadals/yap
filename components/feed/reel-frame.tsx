"use client";

import { ArrowRight } from "lucide-react";

import { useSwipeLeft } from "./use-swipe-left";

/** What every reel gets from the feed. */
export type ReelProps<T> = {
  item: T;
  /** The reel in view (plays, announces). */
  active: boolean;
  /** `performance.now()` when it became active (restarts playback); null until known. */
  since: number | null;
  reducedMotion: boolean;
  /** Open a reel's details (pill, swipe, keyboard): the feed navigates. */
  onOpen: (href: string) => void;
  /** Position in the feed, 1-based, and the feed's length (for assistive tech). */
  position: number;
  setSize: number;
};

/**
 * The shell of one reel: an `<article>` that fills its snap slot, with swipe-left-to-open (the
 * card follows the finger and reveals where it leads underneath). Pass `gradient` (1–6) for the
 * order template, or `kind="video"` for a dark video reel.
 */
export function ReelFrame({
  kind,
  gradient,
  label,
  href,
  action,
  reducedMotion,
  onOpen,
  position,
  setSize,
  children,
}: {
  kind: "video" | "order" | "campaign";
  gradient?: number;
  label: string;
  href: string;
  /** Shown underneath while swiping (the pill's label). */
  action: string;
  reducedMotion: boolean;
  onOpen: (href: string) => void;
  position: number;
  setSize: number;
  children: React.ReactNode;
}) {
  const { ref, handlers } = useSwipeLeft<HTMLElement>({
    onSwipe: () => onOpen(href),
    reducedMotion,
  });
  return (
    <>
      <div aria-hidden className="y-reel-reveal">
        {action}
        <ArrowRight size={18} className="y-flip" />
      </div>
      <article
        ref={ref}
        {...handlers}
        aria-label={label}
        aria-roledescription="reel"
        aria-posinset={position}
        aria-setsize={setSize}
        data-kind={kind}
        data-reel={gradient}
        className={`y-reel ${gradient ? "y-reel-paint" : ""}`}
      >
        {children}
      </article>
    </>
  );
}
