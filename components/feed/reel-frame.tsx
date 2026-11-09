"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { useSwipeLeft } from "./use-swipe-left";

/** What every reel gets from the feed. */
export type ReelProps<T> = {
  item: T;
  /** The reel in view (plays, announces). */
  active: boolean;
  /** `performance.now()` when it became active (restarts playback); null until known. */
  since: number | null;
  reducedMotion: boolean;
  /** Open a reel's details layer (pill, swipe, keyboard). */
  onOpen: (id: string) => void;
  /** Position in the feed, 1-based, and the feed's length (for assistive tech). */
  position: number;
  setSize: number;
};

/**
 * The shell of one reel: an `<article>` that fills its snap slot, with swipe-left-to-open (the
 * reel follows the finger and reveals "Details" underneath). `kind` sets the look: a dark video
 * reel, or a light canvas in one of six `palette`s for orders and campaigns.
 */
export function ReelFrame({
  kind,
  palette,
  label,
  id,
  reducedMotion,
  onOpen,
  position,
  setSize,
  children,
}: {
  kind: "video" | "order" | "campaign";
  palette?: number;
  label: string;
  id: string;
  reducedMotion: boolean;
  onOpen: (id: string) => void;
  position: number;
  setSize: number;
  children: React.ReactNode;
}) {
  const { ref, handlers } = useSwipeLeft<HTMLElement>({
    onSwipe: () => onOpen(id),
    reducedMotion,
  });
  return (
    <>
      <div aria-hidden className="y-reel-reveal">
        Details
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
        data-reel={palette}
        className="y-reel"
      >
        {children}
      </article>
    </>
  );
}

/** Who a reel is from: top start, level with the first feed tab. */
export function ReelWho({
  avatar,
  name,
  badge,
  sub,
  href,
}: {
  avatar: React.ReactNode;
  name: string;
  badge?: React.ReactNode;
  sub: string;
  href?: string;
}) {
  const body = (
    <>
      <span className="y-reel-who-avatar">{avatar}</span>
      <span className="flex min-w-0 flex-col">
        <span className="y-reel-who-name">
          <span className="truncate">{name}</span>
          {badge}
        </span>
        <span className="y-reel-who-sub">{sub}</span>
      </span>
    </>
  );
  if (href)
    return (
      <Link href={href} draggable={false} className="y-reel-who">
        {body}
      </Link>
    );
  return <div className="y-reel-who">{body}</div>;
}

/** The chip inside "Make a Yapp": how many are still open out of how many were ordered. */
export type ReelCtaChip = { open: number; total: number };

/**
 * A reel's one button (also the details layer's sticky button). Neon gets the round arrow and at
 * most one per reel; everything else is a quiet contrast pill.
 */
export function ReelCta({
  label,
  neon = false,
  chip,
  href,
  onClick,
  disabled = false,
  ariaLabel,
}: {
  label: string;
  neon?: boolean;
  chip?: ReelCtaChip;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const body = (
    <>
      <span className="min-w-0 truncate">{label}</span>
      {chip ? (
        <span className="y-reel-count" data-last={chip.open === 1 ? "true" : undefined}>
          <span className="y-reel-count-long">
            {chip.open} of {chip.total} remaining
          </span>
          <span className="y-reel-count-short">{chip.open} left</span>
        </span>
      ) : null}
      {neon ? (
        <span aria-hidden className="y-arrow">
          <ArrowRight size={18} strokeWidth={2.25} className="y-flip" />
        </span>
      ) : null}
    </>
  );
  const shared = {
    className: "y-pill y-reel-cta",
    "data-variant": neon ? "neon" : "contrast",
    "data-size": "lg",
    "data-arrow": neon ? "true" : undefined,
    "data-count": chip ? "true" : undefined,
    "aria-label": ariaLabel,
  };
  if (href)
    return (
      <Link {...shared} href={href} draggable={false}>
        {body}
      </Link>
    );
  return (
    <button type="button" {...shared} disabled={disabled} onClick={onClick}>
      {body}
    </button>
  );
}
