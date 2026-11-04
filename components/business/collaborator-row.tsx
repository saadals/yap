"use client";

import { BadgeCheck, FileText, MessageCircle, Repeat2, UserRound } from "lucide-react";
import Link from "next/link";

import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { money, plural, shortDate } from "@/lib/format";
import { isActive } from "@/lib/selectors";
import { ME, useDemo } from "@/lib/store";

import { type Collaborator, collaboratorInfo } from "./commission-again";
import { useMessageCreator } from "./message-creator";
import { RowMenu } from "./row-menu";

/** A creator you've finished work with: one meta line, "Commission again", the rest under More. */
export function CollaboratorRow({ entry }: { entry: Collaborator }) {
  const s = useDemo();
  const { creator, last } = entry;
  const info = collaboratorInfo(s, entry);
  const message = useMessageCreator(creator);
  const all = s.commissions.filter(
    (c) =>
      c.businessId === ME.businessId &&
      c.creatorId === creator.id &&
      c.status !== "declined" &&
      c.status !== "cancelled",
  );
  const active = all.filter(isActive).length;
  const meta = [
    plural(all.length, "commission"),
    `${money(info.spent)} spent`,
    info.review ? `you rated ${info.review.rating.toFixed(1)}` : "",
    active ? `${active} in progress` : "",
  ].filter(Boolean);

  return (
    <Block as="article" tone="paper" pad="none" className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center md:p-5">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <FaceAvatar id={creator.id} name="" size={48} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="y-head flex min-w-0 items-center gap-1.5">
            <Link href={`/creators/${creator.handle}`} className="truncate hover:underline">
              {creator.name}
            </Link>
            {creator.verified ? <BadgeCheck size={16} aria-label="ID verified" className="flex-none" /> : null}
          </h3>
          <p className="y-small y-fg-2 truncate">
            Last: {last.title} · {shortDate(info.lastDate)}
          </p>
          <p className="y-micro y-fg-2">{meta.join(" · ")}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:flex-none">
        <PillButton
          href={info.repeatHref}
          variant="contrast"
          size="sm"
          className="flex-1 sm:flex-none"
          icon={<Repeat2 size={16} aria-hidden />}
          aria-label={`Commission ${creator.firstName} again`}
        >
          Commission again
        </PillButton>
        <RowMenu
          label={`More for ${creator.firstName}`}
          items={[
            {
              label: message.label,
              icon: <MessageCircle size={16} aria-hidden />,
              href: message.href,
              onSelect: message.start,
            },
            {
              label: "Last commission",
              icon: <FileText size={16} aria-hidden />,
              href: `/business/commissions/${last.id}`,
            },
            { label: "View profile", icon: <UserRound size={16} aria-hidden />, href: `/creators/${creator.handle}` },
          ]}
        />
      </div>
      {message.sheet}
    </Block>
  );
}
