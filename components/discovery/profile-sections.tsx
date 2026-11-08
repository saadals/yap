"use client";

import { BadgeCheck, CalendarClock, CircleCheck, MapPin, MessageCircle, Share2, ShieldCheck, Star } from "lucide-react";
import { useState } from "react";

import { LanguageChips, platformList } from "@/components/domain/chips";
import { SaveCreatorButton } from "@/components/domain/creator-card";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { Ar } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { useToast } from "@/components/ui/toast";
import { compact, num, plural } from "@/lib/format";
import { cityLabel } from "@/lib/selectors";
import { campaignPlatformById, creatorKindById, formatById, nicheById } from "@/lib/taxonomy";
import type { Creator } from "@/lib/types";

import { MessageSheet } from "./message-sheet";
import { availabilityLabel, responseShort } from "./profile-utils";

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Name, one meta line, headline, dialects, and the track record as one quiet row of text.
 * `footer` takes an extra line under the stats (e.g. "Commission again" on phones).
 */
export function ProfileHero({
  creator,
  canMessage,
  footer,
}: {
  creator: Creator;
  canMessage: boolean;
  footer?: React.ReactNode;
}) {
  const toast = useToast();
  const [messageOpen, setMessageOpen] = useState(false);
  const kind = creatorKindById[creator.kind];
  const KindIcon = kind.icon;
  // Connected accounts show the platform and verified real followers only: never a handle or a
  // link out (everything stays in the platform).
  const verifiedSocials = (creator.socials ?? []).filter((social) => social.verified);

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
          <span className="block w-[88px] flex-none md:w-[112px]">
            <FaceAvatar id={creator.id} name="" size="100%" />
          </span>
          <div className="flex gap-2 md:hidden">
            <HeroActions creator={creator} onShare={share} />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {creator.available ? (
            <Badge tone="success" icon={<CircleCheck size={14} aria-hidden />} className="w-fit">
              Available now
            </Badge>
          ) : (
            <Badge tone="neutral" icon={<CalendarClock size={14} aria-hidden />} className="w-fit">
              {availabilityLabel(creator)}
            </Badge>
          )}
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
              {verifiedSocials.length ? (
                <span className="inline-flex items-center gap-1.5" title="Real followers, verified by Yapp">
                  <ShieldCheck size={15} aria-hidden />
                  <span className="sr-only">Verified followers: </span>
                  {verifiedSocials
                    .map((social) => `${compact(social.followers)} on ${campaignPlatformById[social.platform].name}`)
                    .join(" · ")}
                </span>
              ) : creator.kind === "influencer" && creator.followers ? (
                <span>{compact(creator.followers)} followers</span>
              ) : null}
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

      <TrackRecord creator={creator} />

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
      {footer}
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

/** Rating · completed · on time · replies in, as one quiet row of text. */
function TrackRecord({ creator }: { creator: Creator }) {
  const strong = "y-num font-semibold text-(--b-fg)";
  const items: { label: string; text: React.ReactNode }[] = [
    {
      label: "Rating",
      text: (
        <>
          <span className={strong}>
            <Star size={14} aria-hidden className="me-1 inline-block fill-current align-[-1px]" />
            {creator.rating.toFixed(1)}
          </span>{" "}
          ({plural(creator.reviewCount, "review")})
        </>
      ),
    },
    {
      label: "Commissions completed",
      text: (
        <>
          <span className={strong}>{num(creator.completed)}</span> completed
        </>
      ),
    },
    {
      label: "Delivered on time",
      text: (
        <>
          <span className={strong}>{creator.onTimeRate}%</span> on time
        </>
      ),
    },
    {
      label: "Typical response",
      text: (
        <>
          Replies in <span className={strong}>{responseShort(creator.responseHours)}</span>
        </>
      ),
    },
  ];
  return (
    <dl
      aria-label="Track record"
      className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-(--b-line) pt-5 sm:flex sm:flex-wrap sm:gap-x-7"
    >
      {items.map((item) => (
        <div key={item.label}>
          <dt className="sr-only">{item.label}</dt>
          <dd className="y-small y-fg-2">{item.text}</dd>
        </div>
      ))}
    </dl>
  );
}

/* -------------------------------------------------------------------------- */
/* About                                                                       */
/* -------------------------------------------------------------------------- */

/** Bio plus a few plain-text facts. Dialects live in the hero, examples in the portfolio. */
export function AboutBlock({ creator }: { creator: Creator }) {
  const facts = [
    { label: "Formats", value: creator.formats.map((id) => formatById[id].name).join(", ") },
    { label: "Niches", value: creator.niches.map((id) => nicheById[id].name).join(", ") },
    { label: "Makes content for", value: platformList(creator.platforms) },
    { label: "Equipment", value: creator.equipment.join(", ") },
  ].filter((fact) => fact.value);
  return (
    <Block tone="paper" pad="md" className="flex flex-col gap-5" aria-labelledby="about-heading">
      <div className="flex flex-col gap-3">
        <h2 id="about-heading" className="y-display y-title">
          About {creator.firstName}
        </h2>
        <p className="y-body max-w-[62ch]">{creator.bio}</p>
      </div>
      <dl className="grid gap-x-8 gap-y-3 md:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.label} className="flex flex-col gap-0.5">
            <dt className="y-micro y-fg-2">{fact.label}</dt>
            <dd className="y-small">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </Block>
  );
}
