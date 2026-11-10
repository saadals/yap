"use client";

import { CheckCircle2, FilePen } from "lucide-react";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { Block } from "@/components/ui/block";
import { AvatarStack, FaceAvatar } from "@/components/ui/face-avatar";
import { List } from "@/components/ui/list";
import { type AttentionItem } from "@/lib/attention";
import { plural } from "@/lib/format";
import { businessById, campaignSlots, creatorById, requestById } from "@/lib/selectors";
import { type DemoState, useDemo } from "@/lib/store";

import { IconTile } from "./order-row";
import { RowLink } from "./row-link";

const SHOWN = 4;

function Lead({ s, item }: { s: DemoState; item: AttentionItem }) {
  if (item.kind === "review-copies" && item.requestId) {
    const request = requestById(s, item.requestId);
    const people = request
      ? campaignSlots(s, request)
          .map((view) => view.commission)
          .filter((c) => c?.status === "delivered")
          .map((c) => ({ id: c!.creatorId, name: creatorById(s, c!.creatorId)?.name ?? "" }))
      : [];
    if (people.length > 1)
      return (
        <span className="flex w-10 items-center">
          <AvatarStack people={people} size={25} max={2} />
        </span>
      );
    if (people.length) return <FaceAvatar id={people[0].id} name={people[0].name} size={40} />;
  }
  if (item.creatorId) return <FaceAvatar id={item.creatorId} name={creatorById(s, item.creatorId)?.name ?? ""} size={40} />;
  if (item.kind === "draft")
    return (
      <IconTile>
        <FilePen size={18} />
      </IconTile>
    );
  const business = item.businessId ? businessById(s, item.businessId) : undefined;
  return business ? <BusinessLogo business={business} size={40} /> : null;
}

/** The action as a pill-shaped label (the whole row is the link, so this is not a second control). */
function ActionPill({ label, primary }: { label: string; primary: boolean }) {
  return (
    <span aria-hidden className="y-pill pointer-events-none" data-variant={primary ? "neon" : "soft"} data-size="sm">
      {label}
    </span>
  );
}

/**
 * Needs you: every action waiting on the ordering side (lib/attention.ts), most urgent first. The
 * first row's action is the screen's one green; the rest are soft. On phones only the first row
 * shows its action (under the text); the others are plain rows.
 */
export function NeedsYou({ items }: { items: AttentionItem[] }) {
  const s = useDemo();
  const [expanded, setExpanded] = useState(false);

  if (!items.length) {
    return (
      <Block tone="paper" pad="md" className="flex items-start gap-3">
        <CheckCircle2 size={22} aria-hidden className="mt-0.5 flex-none text-(--y-success)" />
        <div className="flex flex-col gap-0.5">
          <p className="y-head">You&apos;re all caught up</p>
          <p className="y-small y-fg-2">
            Nothing is waiting on you. Deliveries to review and new pitches land here first.
          </p>
        </div>
      </Block>
    );
  }

  const shown = expanded ? items : items.slice(0, SHOWN);
  const hidden = items.length - shown.length;
  return (
    <List label="Needs you">
      {shown.map((item, index) => {
        const primary = index === 0;
        const pill = <ActionPill label={item.action} primary={primary} />;
        return (
          <RowLink
            key={`${item.kind}-${item.commissionId ?? item.requestId ?? index}`}
            href={item.href}
            lead={<Lead s={s} item={item} />}
            title={item.title}
            meta={item.line}
            wrap
            ariaLabel={`${item.title}. ${item.line} ${item.action}`}
            end={primary ? pill : <span className="max-sm:hidden">{pill}</span>}
            phoneEnd={primary ? pill : undefined}
            chevron={primary ? false : "phone"}
          />
        );
      })}
      {hidden > 0 ? (
        <button
          type="button"
          role="listitem"
          onClick={() => setExpanded(true)}
          className="y-row y-small !min-h-12 justify-center font-medium"
        >
          Show {plural(hidden, "more thing", "more things")}
        </button>
      ) : null}
    </List>
  );
}
