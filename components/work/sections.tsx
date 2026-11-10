"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { collaboratorInfo } from "@/components/business/commission-again";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { AvatarStack } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import {
  commissionsForBusiness,
  commissionsForCreator,
  isActive,
  me,
  needsAction,
  pastCollaborators,
  pitchesForCreator,
} from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";
import type { Commission, Role } from "@/lib/types";

import { OrderCard } from "./order-card";
import { useTakeWork } from "./take-work";
import { YourOrders } from "./your-orders";

type Filter = "needs" | "active" | "completed" | "cancelled" | "all";

const filters: { id: Filter; label: string; test: (c: Commission, side: Role) => boolean }[] = [
  { id: "needs", label: "Needs you", test: (c, side) => needsAction(c, side) },
  { id: "active", label: "Active", test: (c) => isActive(c) },
  { id: "completed", label: "Completed", test: (c) => c.status === "completed" && !isActive(c) },
  { id: "cancelled", label: "Cancelled", test: (c) => c.status === "cancelled" || c.status === "declined" },
  { id: "all", label: "All", test: () => true },
];

/** Freshly picked campaign slots first (Work spec 6.7.1), then the usual order for the side. */
function makingOrder(list: Commission[]) {
  const picked = (c: Commission) => c.source === "campaign" && c.status === "in_progress" && c.deliveries.length === 0;
  return [
    ...list.filter(picked).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    ...list.filter((c) => !picked(c)),
  ];
}

/** Status chips with counts, then the cards (Ordered: one column; Making: two). */
function OrderList({ side }: { side: Role }) {
  const s = useDemo();
  const [filter, setFilter] = useState<Filter>("active");
  const all = side === "business" ? commissionsForBusiness(s) : makingOrder(commissionsForCreator(s));
  const test = filters.find((f) => f.id === filter)!.test;
  const shown = all.filter((c) => test(c, side));

  return (
    <div className="flex min-w-0 flex-col">
      <div className="y-ochips" role="group" aria-label="Filter by status">
        {filters.map((f) => (
          <FilterChip
            key={f.id}
            size="sm"
            pressed={filter === f.id}
            count={all.filter((c) => f.test(c, side)).length}
            onClick={() => setFilter(f.id)}
            className="flex-none"
          >
            {f.label}
          </FilterChip>
        ))}
      </div>
      {shown.length ? (
        <ul className="y-olist-grid" data-wide={side === "creator" ? "true" : undefined}>
          {shown.map((c) => (
            <li key={c.id} className="flex min-w-0">
              <OrderCard commission={c} side={side} />
            </li>
          ))}
        </ul>
      ) : (
        <Block tone="paper" pad="md">
          <EmptyState
            title="Nothing here"
            body={
              all.length
                ? "Try another filter."
                : side === "business"
                  ? "Orders you place show up here, from the first version to payment."
                  : "Pick a campaign slot or win a pitch, and the work shows up here."
            }
            headingLevel={3}
            action={
              all.length ? (
                <PillButton variant="soft" onClick={() => setFilter("all")}>
                  Show all
                </PillButton>
              ) : side === "creator" ? (
                <PillButton href={paths.findWork()} variant="contrast">
                  Find work
                </PillButton>
              ) : undefined
            }
          />
        </Block>
      )}
    </div>
  );
}

/** Ordered's "Work with them again": a line from something the app knows, and one tap to rebook. */
function WorkAgain() {
  const s = useDemo();
  const people = pastCollaborators(s).filter((entry) => entry.last.source !== "campaign");
  if (!people.length) return null;
  const top = people[0];
  const info = collaboratorInfo(s, top);
  const what = formatById[top.last.brief.format].noun[0];
  const parts: string[] = [];
  if (info.review) parts.push(`${top.creator.firstName}'s ${what}${info.product ? ` for ${info.product.name}` : ""} got ${plural(info.review.rating, "star")}`);
  else parts.push(`${top.creator.firstName} finished your ${what}${info.product ? ` for ${info.product.name}` : ""}`);
  const line = `${parts[0]}${info.learnings ? `, and ${plural(info.learnings, "learning")} carry into the next brief` : ""}. Rebook in two taps.`;
  return (
    <Block as="section" aria-labelledby="again-title" tone="paper" pad="none" className="y-side-card">
      <AvatarStack people={people.slice(0, 3).map((p) => ({ id: p.creator.id, name: p.creator.name }))} size={40} className="mb-4" />
      <h2 id="again-title" className="y-cardhead-t">
        Work with them again
      </h2>
      <p className="y-small y-fg-2 mt-1.5 mb-4">{line}</p>
      <PillButton href={info.repeatHref} variant="contrast" aria-label={`Commission ${top.creator.firstName} again`}>
        Commission again
      </PillButton>
    </Block>
  );
}

/** Ordered (Work spec 6.4.4): the list on the start side; new order, your orders and rebooking beside it. */
export function OrderedView() {
  return (
    <div className="y-ordered">
      <OrderList side="business" />
      <div className="y-side">
        <Link href={paths.newOrder()} className="y-newcta">
          <span className="y-newcta-ic" aria-hidden>
            <Plus size={22} strokeWidth={2.2} />
          </span>
          <span className="min-w-0">
            <b>Post a new order</b>
            <small>UGC campaign or custom order · takes 2 minutes</small>
          </span>
        </Link>
        <YourOrders />
        <WorkAgain />
      </div>
    </div>
  );
}

/** Making (Work spec 6.4.5): picked slots at the top, then everything you're making; pitches below. */
export function MakingView() {
  const s = useDemo();
  const take = useTakeWork();
  if (!me.creator(s)) {
    return (
      <Block tone="paper" pad="lg">
        <EmptyState
          headingLevel={2}
          title="Make videos on Yapp too"
          body="Create a creator profile to take work: pick UGC campaign slots and pitch on custom orders. Same account, same sign-in."
          icon={<Search size={22} aria-hidden />}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <PillButton variant="contrast" onClick={() => take.setUp()}>
                Create a creator profile
              </PillButton>
              <PillButton variant="ghost" href={paths.findWork()}>
                See what&apos;s open
              </PillButton>
            </div>
          }
        />
      </Block>
    );
  }
  const waiting = pitchesForCreator(s).filter((p) => ["sent", "viewed", "shortlisted"].includes(p.status)).length;
  return (
    <div className="flex flex-col">
      <OrderList side="creator" />
      <p className="y-pitchline">
        {waiting ? `${plural(waiting, "pitch", "pitches")} waiting to hear back · ` : ""}
        <Link href={paths.pitches}>Your pitches</Link>
      </p>
    </div>
  );
}
