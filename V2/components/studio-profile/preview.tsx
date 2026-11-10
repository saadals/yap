"use client";

import { BadgeCheck, Check, ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { VideoThumb } from "@/components/domain/video-thumb";
import { Rating } from "@/components/domain/stars";
import { ProgressBar } from "@/components/ui/progress";
import { money } from "@/lib/format";
import { paths } from "@/lib/paths";
import { cityById, featuredVideo } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { creatorKindById, languageById } from "@/lib/taxonomy";
import type { Creator } from "@/lib/types";

import type { StrengthItem } from "./draft";

/**
 * How brands see your card in Discover, drawn from the draft (so it follows unsaved edits): the
 * featured video as the cover, name, rating, city and languages, "From $X". Mirrors CreatorCard,
 * without the link and the heart.
 */
export function CardPreview({ creator }: { creator: Creator }) {
  const s = useDemo();
  const video = featuredVideo(s, creator);
  const city = cityById(creator.cityId);
  const prices = creator.packages.map((p) => p.price).filter((p) => Number.isFinite(p) && p > 0);
  const from = prices.length ? Math.min(...prices) : undefined;
  const meta = [city?.name, creator.languages.slice(0, 2).map((id) => languageById[id].name).join(", ")].filter(Boolean).join(" · ");

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="y-micro y-fg-2 px-1">How brands see your card</figcaption>
      <div data-tone="paper" className="y-block flex flex-col overflow-hidden" aria-label={`Preview of your card: ${creator.name}`}>
        <div className="relative p-2 pb-0">
          {video ? (
            <VideoThumb video={video} frame="4:5" hookAt="bottom" showViews={false} decorative />
          ) : (
            <div className="y-tile grid aspect-[4/5] place-items-center">
              <span className="y-small y-fg-2 px-6 text-center">Add a video to give your card a cover</span>
            </div>
          )}
          {!creator.available ? (
            <span className="absolute start-4 top-4 z-[3] rounded-full bg-[#0e0e10]/80 px-2.5 py-1 text-xs font-semibold text-white">
              Booked
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-1 px-4 pt-3 pb-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="y-head flex min-w-0 items-center gap-1.5">
              <span className="truncate">{creator.name}</span>
              {creator.verified ? <BadgeCheck size={16} aria-label="ID verified" className="flex-none" /> : null}
            </p>
            {creator.reviewCount ? <Rating value={creator.rating} /> : <span className="y-micro y-fg-2">New</span>}
          </div>
          <p className="y-small y-fg-2 truncate">{meta}</p>
          <p className="y-small mt-2">
            <span className="font-semibold">{from ? `From ${money(from)}` : "Set a price"}</span>
            <span className="y-fg-2"> · {creatorKindById[creator.kind].name.toLowerCase()}</span>
          </p>
        </div>
      </div>
    </figure>
  );
}

const linkClass = "y-small flex min-h-10 items-center gap-2.5 rounded-(--y-r-sm) px-2 hover:bg-(--b-chip)";

function ItemBody({ item }: { item: StrengthItem }) {
  return (
    <>
      <Plus size={15} aria-hidden className="flex-none" />
      <span className="flex-1 font-medium">{item.label}</span>
      <span className="y-micro y-fg-2 y-num">{item.detail}</span>
    </>
  );
}

/** Profile strength: a meter and what's still missing, each a link to the section that fixes it. */
export function StrengthCard({ score, items, compact = false }: { score: number; items: StrengthItem[]; compact?: boolean }) {
  const open = items.filter((item) => !item.done);
  const [expanded, setExpanded] = useState(false);
  const list = (
    <ul className="flex flex-col gap-1">
      {open.map((item) => (
        <li key={item.id}>
          {item.section === "settings" ? (
            <Link href={paths.settings()} className={linkClass}>
              <ItemBody item={item} />
            </Link>
          ) : (
            <a href={`#${item.section}`} className={linkClass}>
              <ItemBody item={item} />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-labelledby="strength-title" data-tone="paper" className="y-block flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="strength-title" className="y-small font-semibold">
          Profile strength
        </h2>
        <span className="y-small y-num font-semibold">{score}%</span>
      </div>
      <ProgressBar value={score / 100} label={`Profile strength ${score}%`} done={score === 100} />
      {open.length ? (
        compact ? (
          <>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
              className="y-small flex min-h-10 items-center justify-between gap-2 text-start"
            >
              <span>
                {open.length === 1 ? "One thing" : `${open.length} things`} would make it stronger
              </span>
              <ChevronDown size={16} aria-hidden className={`flex-none transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
            {expanded ? list : null}
          </>
        ) : (
          <>
            <p className="y-micro y-fg-2">Complete profiles get invited to more orders.</p>
            {list}
          </>
        )
      ) : (
        <p className="y-small y-fg-2 flex items-start gap-2">
          <Check size={16} aria-hidden className="mt-0.5 flex-none" />
          Everything brands look for is there. Keep your portfolio fresh with your latest work.
        </p>
      )}
    </section>
  );
}
