/**
 * What makes a creator profile convincing to a brand (from V1's components/creator/profile-strength.tsx),
 * reduced to the one thing to do next. Studio Today shows it as a single line, only when something
 * is missing. Pure, safe in render.
 */

import { paths } from "@/lib/paths";
import { portfolio } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import type { Creator } from "@/lib/types";

export type ProfileGap = { id: string; text: string; href: string };

export const BIO_MIN = 80;

/** Everything still missing, most valuable first. */
export function profileGaps(s: DemoState, creator: Creator): ProfileGap[] {
  const videos = portfolio(s, creator);
  const sampled = new Set(videos.map((v) => v.lang));
  const unsampled = creator.languages.filter((l) => !sampled.has(l));
  const priced = creator.packages.filter((p) => p.price > 0).length;
  const connected = (creator.socials ?? []).filter((x) => x.verified);
  const gaps: (ProfileGap | false)[] = [
    videos.length < 5 && {
      id: "portfolio",
      text: videos.length === 0 ? "Add your first videos: brands hire from what they can watch" : `Add ${5 - videos.length} more videos to your portfolio`,
      href: paths.studioProfile("portfolio"),
    },
    connected.length === 0 && {
      id: "accounts",
      text: "Connect a social account to unlock UGC campaigns",
      href: paths.studioProfile("accounts"),
    },
    creator.bio.trim().length < BIO_MIN && {
      id: "bio",
      text: "Write a short intro so brands know who they're hiring",
      href: paths.studioProfile("about"),
    },
    priced < 3 && {
      id: "packages",
      text: `Price all three packages (${priced} of 3 so far)`,
      href: paths.studioProfile("packages"),
    },
    unsampled.length > 0 &&
      videos.length > 0 && {
        id: "languages",
        text: `Add a sample in every language you list`,
        href: paths.studioProfile("portfolio"),
      },
    !creator.portfolioIds.includes(creator.featuredVideoId) &&
      videos.length > 0 && {
        id: "featured",
        text: "Pick a featured video: it's the first thing brands watch",
        href: paths.studioProfile("portfolio"),
      },
    creator.addons.length < 2 && {
      id: "addons",
      text: `Offer ${creator.addons.length === 0 ? "two add-ons" : "one more add-on"}, like subtitles or extra hooks`,
      href: paths.studioProfile("packages"),
    },
  ];
  return gaps.filter((g): g is ProfileGap => Boolean(g));
}
