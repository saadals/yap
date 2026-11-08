"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";

import { platformName } from "@/components/account/social";
import { paths } from "@/lib/paths";
import type { DemoState } from "@/lib/store";
import { portfolio } from "@/lib/selectors";
import type { Creator } from "@/lib/types";

export type StrengthItem = {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  /** Section of Edit profile (or another page) that fixes it. */
  href: string;
};

export const BIO_MIN = 80;

/** What makes a creator profile convincing to a buyer, as a checklist. */
export function profileChecklist(s: DemoState, creator: Creator): StrengthItem[] {
  const videos = portfolio(s, creator);
  const dialects = new Set(videos.map((v) => v.lang));
  const priced = creator.packages.filter((p) => p.price > 0).length;
  const bioLength = creator.bio.trim().length;
  const connected = (creator.socials ?? []).filter((x) => x.verified);
  return [
    {
      id: "portfolio",
      label: "Portfolio of 5+ videos",
      detail: videos.length >= 5 ? `${videos.length} videos` : `${videos.length} of 5`,
      done: videos.length >= 5,
      href: paths.editProfile("portfolio"),
    },
    {
      id: "packages",
      label: "All 3 packages priced",
      detail: `${Math.min(priced, 3)} of 3`,
      done: priced >= 3,
      href: paths.editProfile("packages"),
    },
    {
      id: "bio",
      label: "Intro bio",
      detail: bioLength >= BIO_MIN ? "Written" : `${bioLength} of ${BIO_MIN} characters`,
      done: bioLength >= BIO_MIN,
      href: paths.editProfile("about"),
    },
    {
      id: "verified",
      label: "ID verified",
      detail: creator.verified ? "Verified" : "Takes 2 minutes",
      done: creator.verified,
      href: paths.settings("making"),
    },
    {
      id: "accounts",
      label: "A social account connected",
      detail: connected.length ? connected.map((x) => platformName(x.platform)).join(", ") : "Unlocks campaigns",
      done: connected.length > 0,
      href: paths.editProfile("accounts"),
    },
    {
      id: "dialects",
      label: "Samples in 3+ dialects",
      detail: `${Math.min(dialects.size, 3)} of 3`,
      done: dialects.size >= 3,
      href: paths.editProfile("portfolio"),
    },
    {
      id: "featured",
      label: "Featured video picked",
      detail: creator.portfolioIds.includes(creator.featuredVideoId) ? "Picked" : "Star your best piece",
      done: creator.portfolioIds.includes(creator.featuredVideoId),
      href: paths.editProfile("portfolio"),
    },
    {
      id: "addons",
      label: "2+ add-ons offered",
      detail: `${creator.addons.length} offered`,
      done: creator.addons.length >= 2,
      href: paths.editProfile("addons"),
    },
  ];
}

export function strengthScore(items: StrengthItem[]): number {
  if (!items.length) return 0;
  return Math.round((items.filter((i) => i.done).length / items.length) * 100);
}

/** Segmented progress bar (20 segments) for profile strength. */
export function StrengthMeter({ value, label }: { value: number; label: string }) {
  const filled = Math.round(value / 5);
  return (
    <div
      className="flex gap-1"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      {Array.from({ length: 20 }, (_, index) => (
        <span
          key={index}
          className={`h-2.5 flex-1 rounded-full ${index < filled ? "bg-(--b-fg)" : "bg-(--b-line)"}`}
        />
      ))}
    </div>
  );
}

/** Checklist rows. Done items show a check; open items link to where they are fixed. */
export function StrengthList({
  items,
  onPick,
}: {
  items: StrengthItem[];
  /** Called when an item is followed, e.g. to open the matching profile section. */
  onPick?: (item: StrengthItem) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            onClick={() => onPick?.(item)}
            className="y-tile y-hoverable flex min-h-14 items-center gap-3 py-2 ps-2 pe-4"
          >
            <span
              className={`grid size-10 flex-none place-items-center rounded-full ${
                item.done ? "bg-(--b-fg) text-(--b-bg)" : "bg-(--b-bg)"
              }`}
            >
              {item.done ? (
                <Check size={18} strokeWidth={2.75} aria-hidden />
              ) : (
                <Plus size={18} aria-hidden />
              )}
            </span>
            <span className="y-small flex-1 font-medium">
              {item.label}
              <span className="sr-only">{item.done ? " (done)" : " (to do)"}</span>
            </span>
            <span className="y-micro y-fg-2 y-num text-end">{item.detail}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
