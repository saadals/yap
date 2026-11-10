"use client";

import { BadgeCheck, CircleCheck, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { compact } from "@/lib/format";
import { campaignPlatformById, followerTiers, tierFor } from "@/lib/taxonomy";
import type { CampaignPlatformId, SocialAccount } from "@/lib/types";

/**
 * Connected social accounts (read-only): shared copy, the simulated "connect" sequence and the
 * one-line result. Used by Edit profile, the creator setup sheet and onboarding.
 */

export const READ_ONLY_NOTE =
  "Read-only: we never post for you. Yapp checks real followers, and later your campaign posts.";

/** Lowest follower count campaigns accept ("10K"). */
export const CAMPAIGN_FLOOR = compact(followerTiers[0].min);

export const platformName = (platform: CampaignPlatformId) => campaignPlatformById[platform].name;

/** "10K–20K tier · you can pick campaigns for this tier" or the below-10K note. Brands set each campaign's price. */
export function tierLine(followers: number): string {
  const tier = tierFor(followers);
  if (!tier) return `Below ${CAMPAIGN_FLOOR}: campaigns start at ${CAMPAIGN_FLOOR}`;
  return `${tier.label} tier · you can pick campaigns for this tier`;
}

/** "TikTok 18.4K verified · Instagram 9.1K verified". */
export function socialsSummary(socials: SocialAccount[] = []): string {
  return socials
    .map((s) => `${platformName(s.platform)} ${compact(s.followers)}${s.verified ? " verified" : ""}`)
    .join(" · ");
}

export type ConnectPhase = "idle" | "connecting" | "checking" | "done";

export const phaseLabel: Record<Exclude<ConnectPhase, "idle">, string> = {
  connecting: "Connecting read-only…",
  checking: "Checking real followers…",
  done: "Verified",
};

/**
 * The simulated connection: "Connecting read-only…" then "Checking real followers…" (about 1.2s
 * each), then `onVerified` runs and the phase settles on "done". Timers start in event handlers.
 */
export function useConnectSequence(step = 1200) {
  const [phase, setPhase] = useState<ConnectPhase>("idle");
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((timer) => window.clearTimeout(timer));
  }, []);
  const start = (onVerified: () => void) => {
    setPhase("connecting");
    timers.current.push(
      window.setTimeout(() => setPhase("checking"), step),
      window.setTimeout(() => {
        onVerified();
        setPhase("done");
      }, step * 2),
    );
  };
  const reset = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.length = 0;
    setPhase("idle");
  };
  return { phase, start, reset, busy: phase === "connecting" || phase === "checking" };
}

/** The live status line under a connect form (announced politely). */
export function ConnectStatus({
  phase,
  platform,
  followers,
}: {
  phase: ConnectPhase;
  platform: CampaignPlatformId;
  followers?: number;
}) {
  return (
    <p className="y-small flex min-h-6 items-start gap-2" aria-live="polite">
      {phase === "connecting" || phase === "checking" ? (
        <>
          <LoaderCircle size={16} aria-hidden className="mt-0.5 flex-none animate-spin" />
          <span className="y-fg-2">{phaseLabel[phase]}</span>
        </>
      ) : phase === "done" && followers !== undefined ? (
        <>
          <CircleCheck size={16} aria-hidden className="mt-0.5 flex-none text-(--y-success)" />
          <span>
            <span className="font-semibold">
              Verified: {compact(followers)} real followers on {platformName(platform)}.
            </span>{" "}
            <span className="y-fg-2">{tierLine(followers)}.</span>
          </span>
        </>
      ) : null}
    </p>
  );
}

/** Small "verified" mark for a connected account row. */
export function VerifiedMark() {
  return <BadgeCheck size={16} role="img" aria-label="Verified" className="flex-none" />;
}
