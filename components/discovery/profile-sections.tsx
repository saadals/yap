"use client";

import {
  BadgeCheck,
  CalendarClock,
  Camera,
  CircleCheck,
  MapPin,
  Megaphone,
  MessageCircle,
  Share2,
  Star,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { FormatChip, LanguageChips, PlatformChips } from "@/components/domain/chips";
import { SaveCreatorButton } from "@/components/domain/creator-card";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { Chip } from "@/components/ui/chip";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { Ar } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { useToast } from "@/components/ui/toast";
import { compact, monthYearOf, num, plural } from "@/lib/format";
import { cityLabel, portfolio } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { creatorKindById, formatById, nicheById } from "@/lib/taxonomy";
import type { Creator } from "@/lib/types";

import { MessageSheet } from "./message-sheet";
import { availabilityLabel, responseShort } from "./profile-utils";

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */

export function ProfileHero({ creator, canMessage }: { creator: Creator; canMessage: boolean }) {
  const toast = useToast();
  const [messageOpen, setMessageOpen] = useState(false);
  const kind = creatorKindById[creator.kind];
  const KindIcon = kind.icon;

  const share = async () => {
    const url = window.location.href.split("#")[0];
    try {
      await navigator.clipboard.writeText(url);
      toast({ message: `Link to ${creator.firstName}'s profile copied` });
    } catch {
      toast({ message: `Copy this link: ${url}`, tone: "info" });
    }
  };

  return (
    <Block tone="paper" pad="lg" className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-7">
        <div className="flex items-start justify-between gap-3">
          <span className="block w-[88px] flex-none md:w-[128px]">
            <FaceAvatar id={creator.id} name="" size="100%" />
          </span>
          <div className="flex gap-2 md:hidden">
            <HeroActions creator={creator} onShare={share} />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {creator.verified ? (
              <Badge tone="info" icon={<BadgeCheck size={14} aria-hidden />}>
                ID verified
              </Badge>
            ) : null}
            {creator.topRated ? (
              <Badge tone="ink" icon={<Zap size={14} aria-hidden className="fill-current" />}>
                Top rated
              </Badge>
            ) : null}
            {creator.available ? (
              <Badge tone="success" icon={<CircleCheck size={14} aria-hidden />}>
                Available now
              </Badge>
            ) : (
              <Badge tone="neutral" icon={<CalendarClock size={14} aria-hidden />}>
                {availabilityLabel(creator)}
              </Badge>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="y-display y-t-display flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{creator.name}</span>
              {creator.verified ? (
                <BadgeCheck
                  role="img"
                  aria-label="ID verified"
                  className="size-8 flex-none md:size-10"
                  strokeWidth={2}
                />
              ) : null}
            </h1>
            <p className="y-small y-fg-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold text-(--b-fg)">@{creator.handle}</span>
              <span className="inline-flex items-center gap-1.5">
                <KindIcon size={15} aria-hidden /> {kind.name}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={15} aria-hidden /> {cityLabel(creator.cityId)}
              </span>
              {creator.nameAr ? <Ar className="y-body">{creator.nameAr}</Ar> : null}
            </p>
          </div>
          <p className="y-lead max-w-[52ch]">{creator.headline}</p>
          <LanguageChips ids={creator.languages} native />
        </div>

        <div className="hidden flex-none flex-col items-end gap-2 md:flex">
          <div className="flex gap-2">
            <HeroActions creator={creator} onShare={share} />
          </div>
          {canMessage ? (
            <PillButton
              variant="soft"
              size="sm"
              icon={<MessageCircle size={16} aria-hidden />}
              onClick={() => setMessageOpen(true)}
            >
              Message
            </PillButton>
          ) : null}
        </div>
      </div>
      {canMessage ? (
        <PillButton
          variant="soft"
          className="md:hidden"
          icon={<MessageCircle size={18} aria-hidden />}
          onClick={() => setMessageOpen(true)}
        >
          Message {creator.firstName}
        </PillButton>
      ) : null}
      {canMessage ? (
        <MessageSheet creator={creator} open={messageOpen} onClose={() => setMessageOpen(false)} />
      ) : null}
    </Block>
  );
}

function HeroActions({ creator, onShare }: { creator: Creator; onShare: () => void }) {
  return (
    <>
      <SaveCreatorButton creator={creator} variant="soft" />
      <RoundIconButton label="Share profile" size="sm" onClick={onShare}>
        <Share2 size={18} aria-hidden />
      </RoundIconButton>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Trust stats                                                                 */
/* -------------------------------------------------------------------------- */

function Stat({ value, label, sub }: { value: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="flex flex-col-reverse gap-1.5">
      <dt className="y-small y-fg-2">
        {label}
        {sub ? <span className="y-micro y-fg-3 block">{sub}</span> : null}
      </dt>
      <dd className="y-display y-num text-[36px] leading-none font-semibold tracking-[-0.04em] md:text-[44px]">
        {value}
      </dd>
    </div>
  );
}

export function TrustStats({ creator }: { creator: Creator }) {
  const since = monthYearOf(creator.memberSince);
  const [month, year] = since.split(" ");
  return (
    <Block tone="night" pad="md" className="flex flex-col gap-6" aria-label="Track record">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 xl:grid-cols-6">
        <Stat
          value={
            <span className="inline-flex items-center gap-1.5">
              <Star aria-hidden className="size-7 fill-current md:size-8" />
              {creator.rating.toFixed(1)}
            </span>
          }
          label={`${plural(creator.reviewCount, "review")}`}
        />
        <Stat value={num(creator.completed)} label="Commissions completed" />
        <Stat value={`${creator.onTimeRate}%`} label="Delivered on time" />
        <Stat value={`${creator.repeatClientRate}%`} label="Repeat clients" sub="Hired them again" />
        <Stat value={responseShort(creator.responseHours)} label="Typical response" />
        <Stat value={year} label={`On Yapp since ${month}`} />
      </dl>
      {creator.kind === "influencer" && creator.followers ? (
        <p className="y-small flex items-center gap-2 border-t border-(--b-line) pt-4">
          <Megaphone size={18} aria-hidden className="flex-none" />
          <span>
            <span className="font-semibold">{compact(creator.followers)} followers.</span>{" "}
            <span className="y-fg-2">
              Optional: they can also post your video to their own audience as an add-on.
            </span>
          </span>
        </p>
      ) : null}
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* About                                                                       */
/* -------------------------------------------------------------------------- */

export function AboutBlock({ s, creator }: { s: DemoState; creator: Creator }) {
  const videos = portfolio(s, creator);
  return (
    <Block tone="paper" pad="md" className="flex flex-col gap-7" aria-labelledby="about-heading">
      <div className="flex flex-col gap-3">
        <h2 id="about-heading" className="y-display y-title">
          About {creator.firstName}
        </h2>
        <p className="y-body max-w-[62ch]">{creator.bio}</p>
      </div>

      <dl className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <dt className="y-micro y-fg-2">Niches</dt>
          <dd className="flex flex-wrap gap-1.5">
            {creator.niches.map((id) => (
              <Chip key={id}>{nicheById[id].name}</Chip>
            ))}
          </dd>
        </div>
        <div className="flex flex-col gap-2">
          <dt className="y-micro y-fg-2">Makes content for</dt>
          <dd>
            <PlatformChips ids={creator.platforms} />
          </dd>
        </div>
        <div className="flex flex-col gap-2">
          <dt className="y-micro y-fg-2">Speaks</dt>
          <dd>
            <LanguageChips ids={creator.languages} native />
          </dd>
        </div>
        {creator.equipment.length ? (
          <div className="flex flex-col gap-2">
            <dt className="y-micro y-fg-2">Equipment</dt>
            <dd>
              <ul className="flex flex-col gap-1.5">
                {creator.equipment.map((item) => (
                  <li key={item} className="y-small flex items-start gap-2">
                    <Camera size={15} aria-hidden className="mt-0.5 flex-none" />
                    {item}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="flex flex-col gap-3">
        <h3 className="y-head">Formats {creator.firstName} offers</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {creator.formats.map((id) => {
            const format = formatById[id];
            const made = videos.filter((v) => v.format === id).length;
            return (
              <li key={id} className="y-tile flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <FormatChip id={id} className="!bg-(--b-bg)" />
                  <span className="y-micro y-fg-2">
                    {made ? `${plural(made, "example")} below` : "No example yet"}
                  </span>
                </div>
                <p className="y-small y-fg-2">{format.description}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </Block>
  );
}
