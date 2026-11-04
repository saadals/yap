"use client";

import { BadgeCheck, CircleDashed, Repeat2, Star } from "lucide-react";
import Link from "next/link";

import { VideoThumb } from "@/components/domain/video-thumb";
import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { money, shortDate } from "@/lib/format";
import { isActive, latestDelivery } from "@/lib/selectors";
import { ME, useDemo } from "@/lib/store";

import { type Collaborator, collaboratorInfo } from "./commission-again";
import { MessageCreatorButton } from "./message-creator";

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="y-tile flex min-w-0 flex-col-reverse gap-1 p-3">
      <dt className="y-micro y-fg-2">{label}</dt>
      <dd className="y-display y-num text-[22px] leading-none font-semibold tracking-[-0.02em]">{children}</dd>
    </div>
  );
}

/** A creator you've finished work with: the last delivery, the numbers, and "Commission again". */
export function CollaboratorRow({ entry }: { entry: Collaborator }) {
  const s = useDemo();
  const { creator, last } = entry;
  const info = collaboratorInfo(s, entry);
  const video = latestDelivery(last)?.video;
  const all = s.commissions.filter(
    (c) =>
      c.businessId === ME.businessId &&
      c.creatorId === creator.id &&
      c.status !== "declined" &&
      c.status !== "cancelled",
  );
  const active = all.filter(isActive).length;

  return (
    <Block as="article" tone="paper" pad="none" className="flex flex-col gap-4 p-3 md:flex-row md:items-center md:gap-5 md:p-4">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <Link
          href={`/business/commissions/${last.id}`}
          className="block w-20 flex-none md:w-24"
          aria-label={`Last delivery: ${last.title}`}
        >
          {video ? (
            <VideoThumb video={video} frame="4:5" showHook={false} decorative />
          ) : (
            <span className="block aspect-[4/5] rounded-(--y-r-tile) bg-(--y-mist)" />
          )}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
          <div className="flex items-center gap-2">
            <FaceAvatar id={creator.id} name="" size={28} />
            <h3 className="y-head flex min-w-0 items-center gap-1.5">
              <Link href={`/creators/${creator.handle}`} className="truncate hover:underline">
                {creator.name}
              </Link>
              {creator.verified ? <BadgeCheck size={16} aria-label="ID verified" className="flex-none" /> : null}
            </h3>
          </div>
          <p className="y-small y-fg-2">
            Last:{" "}
            <Link href={`/business/commissions/${last.id}`} className="y-link font-medium text-(--b-fg)">
              {last.title}
            </Link>{" "}
            · {shortDate(info.lastDate)}
          </p>
          <p className="y-micro y-fg-2 inline-flex items-center gap-1.5">
            <Repeat2 size={14} aria-hidden /> {info.carry} carry over
          </p>
          {active ? (
            <p className="y-micro inline-flex items-center gap-1.5 font-semibold">
              <CircleDashed size={14} aria-hidden /> {active === 1 ? "1 commission" : `${active} commissions`} in progress now
            </p>
          ) : null}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 md:w-[340px] md:flex-none">
        <Stat label="Commissions">{all.length}</Stat>
        <Stat label="Spent with them">{money(info.spent)}</Stat>
        <Stat label="Your last rating">
          {info.review ? (
            <span className="inline-flex items-center gap-1" aria-label={`You rated ${info.review.rating} out of 5`}>
              <Star size={17} aria-hidden className="fill-current" />
              <span aria-hidden>{info.review.rating.toFixed(1)}</span>
            </span>
          ) : (
            <span className="y-small y-fg-2">Not yet</span>
          )}
        </Stat>
      </dl>

      <div className="flex flex-wrap gap-2 md:w-44 md:flex-none md:flex-col md:items-stretch">
        <PillButton
          href={info.repeatHref}
          variant="contrast"
          size="sm"
          icon={<Repeat2 size={16} aria-hidden />}
          aria-label={`Commission ${creator.firstName} again`}
        >
          Commission again
        </PillButton>
        <MessageCreatorButton creator={creator} />
      </div>
    </Block>
  );
}
