"use client";

import { BadgeCheck, Eye, Heart, PencilLine, Share2, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";

import { BusinessLogo } from "@/components/domain/business-logo";
import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { compact, creatorNet, lengthLabel, money, moneyExact, num, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { cityById, isSaved } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { formatById, languageById } from "@/lib/taxonomy";

import { packagesInOrder, tierName } from "@/components/creator-profile/utils";

import type { WatchItem } from "./watch-items";
import { orderFromVideoHref, useShareVideo, useToggleSave } from "./watch-reel";

/**
 * Desktop: who made the video in view, what it was made for, their packages (listed prices; on
 * your own videos, with what you earn) and the one green button. Follows the reel as you scroll.
 */
export function WatchPanel({ item, own }: { item: WatchItem; own: boolean }) {
  const s = useDemo();
  const { account } = usePrefs();
  const signedIn = Boolean(account);
  const { video, creator } = item;
  const saved = signedIn && isSaved(s, creator.id);
  const toggleSave = useToggleSave();
  const share = useShareVideo();
  const business = video.madeFor ? s.businesses.find((b) => b.name === video.madeFor) : undefined;
  const packages = packagesInOrder(creator);
  const city = cityById(creator.cityId);

  return (
    <Block tone="paper" pad="md" className="flex flex-col gap-4" aria-label={`About ${creator.name}`}>
      <Link href={paths.creator(creator.handle)} className="group flex items-center gap-3 rounded-(--y-r-tile)">
        <FaceAvatar id={creator.id} name="" size={52} />
        <span className="flex min-w-0 flex-col">
          <span className="y-head flex items-center gap-1 group-hover:underline">
            <span className="truncate">{creator.name}</span>
            {creator.verified ? <BadgeCheck size={16} aria-label="ID verified" className="flex-none" /> : null}
          </span>
          <span className="y-small y-fg-2 truncate">
            @{creator.handle}
            {city ? ` · ${city.name}` : ""}
          </span>
        </span>
      </Link>
      <div className="flex flex-col gap-1">
        <p className="y-small">{creator.headline}</p>
        <p className="y-small y-fg-2">
          {creator.reviewCount ? (
            <>
              <Star size={13} aria-hidden className="me-1 inline-block fill-current align-[-1px] text-(--b-fg)" />
              <span className="font-medium text-(--b-fg)">{creator.rating.toFixed(1)}</span> ({num(creator.reviewCount)}) ·{" "}
            </>
          ) : null}
          {num(creator.completed)} completed · {creator.onTimeRate}% on time
        </p>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-(--b-line) pt-4">
        <span className="y-eyebrow">This video</span>
        <p className="y-small font-medium">{video.title}</p>
        <p className="y-small y-fg-2">
          {formatById[video.format].name} · {languageById[video.lang].name} · {lengthLabel(video.durationSec)}
        </p>
        <p className="y-small y-fg-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {video.madeFor ? (
            <span className="inline-flex items-center gap-1.5">
              {business ? <BusinessLogo business={business} size={20} /> : null}
              Made for {video.madeFor}
            </span>
          ) : (
            <span>Spec piece, not client work</span>
          )}
          {video.stats ? (
            <span className="inline-flex items-center gap-1">
              <Eye size={14} aria-hidden /> {compact(video.stats.views)} views
            </span>
          ) : null}
        </p>
      </div>

      {packages.length ? (
        <div className="flex flex-col border-t border-(--b-line) pt-3">
          <span className="y-eyebrow pb-1">Packages</span>
          <ul className="flex flex-col divide-y divide-(--b-line)">
            {packages.map((pkg) => (
              <li key={pkg.id} className="flex items-baseline gap-3 py-2">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="y-small font-medium">{packages.length > 1 ? tierName[pkg.tier] : pkg.name}</span>
                  <span className="y-micro y-fg-2 truncate">
                    {packages.length > 1 ? `${pkg.name} · ` : ""}
                    {plural(pkg.deliveryDays, "day")}
                  </span>
                </span>
                <span className="y-small y-num flex-none text-end font-medium">
                  {money(pkg.price)}
                  {/* Your own packages: what you earn from each listed price. */}
                  {own ? <span className="y-micro y-fg-2 block font-normal">you earn {moneyExact(creatorNet(pkg.price))}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="y-micro y-fg-2 pt-1">Usage rights and raw footage are included in every price.</p>
        </div>
      ) : null}

      {own ? (
        <PillButton href={paths.studioProfile()} variant="neon" size="lg" arrow icon={<PencilLine size={17} aria-hidden />} className="w-full">
          Edit your profile
        </PillButton>
      ) : (
        <div className="flex flex-col gap-2">
          <PillButton href={orderFromVideoHref(item, signedIn)} variant="neon" size="lg" arrow className="w-full">
            Order from {creator.firstName}
          </PillButton>
          <p className="y-micro y-fg-2 flex items-center justify-center gap-1.5">
            <ShieldCheck size={14} aria-hidden className="flex-none" />
            Payment is held until you approve the video
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <PillButton href={paths.creator(creator.handle)} variant="outline" size="sm" className="flex-1">
          View profile
        </PillButton>
        {own ? null : (
          <RoundIconButton
            label={saved ? `Remove ${creator.name} from saved` : `Save ${creator.name}`}
            size="sm"
            aria-pressed={saved}
            onClick={() => toggleSave(creator, paths.watch({ video: video.id, creator: creator.handle }))}
          >
            <Heart size={17} aria-hidden className={saved ? "fill-current" : ""} />
          </RoundIconButton>
        )}
        <RoundIconButton label="Share this video" size="sm" onClick={() => share(item)}>
          <Share2 size={17} aria-hidden />
        </RoundIconButton>
      </div>
    </Block>
  );
}
