"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { CommissionCard } from "@/components/domain/commission-card";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { PillButton } from "@/components/ui/pill-button";
import { JobCardSkeleton } from "@/components/ui/skeleton";
import { plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import {
  businessById,
  commissionsForBusiness,
  commissionsForCreator,
  creatorById,
  isActive,
  needsAction,
  productById,
  requestById,
} from "@/lib/selectors";
import { type DemoState, useDemo, useHydrated } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";
import type { Commission, Role } from "@/lib/types";

type Filter = "needs" | "active" | "completed" | "cancelled" | "all";

/** Campaign slots count as active until the approved video is posted (needsAction / isActive). */
const filterTest: Record<Filter, (c: Commission, side: Role) => boolean> = {
  needs: (c, side) => needsAction(c, side),
  active: (c) => isActive(c),
  completed: (c) => c.status === "completed",
  cancelled: (c) => c.status === "cancelled" || c.status === "declined",
  all: () => true,
};

const filterLabels: Record<Filter, string> = {
  needs: "Needs you",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
  all: "All",
};

function matches(s: DemoState, c: Commission, side: Role, query: string) {
  if (!query) return true;
  const other =
    side === "business" ? creatorById(s, c.creatorId)?.name : businessById(s, c.businessId)?.name;
  const haystack = [
    c.title,
    c.id,
    other,
    productById(s, c.brief.productId)?.name,
    formatById[c.brief.format]?.name,
    c.source === "campaign" ? `campaign ugc ${c.requestId ? requestById(s, c.requestId)?.title ?? "" : ""}` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

/**
 * The commissions on one side of the account, for the Work tab: filter chips with counts, search,
 * and a card grid. "business" = work this account ordered (campaign slots are managed from the
 * campaign instead), "creator" = work it's making (campaign slots included). No page header: the
 * Work page owns it.
 */
export function CommissionList({ side, wide = false }: { side: Role; /** Full-width grid (3 columns on large screens). */ wide?: boolean }) {
  const s = useDemo();
  const hydrated = useHydrated();
  const [filter, setFilter] = useState<Filter>("active");
  const [query, setQuery] = useState("");

  const all = useMemo(
    () => (side === "business" ? commissionsForBusiness(s) : commissionsForCreator(s)),
    [s, side],
  );
  const counts = useMemo(() => {
    const out = {} as Record<Filter, number>;
    (Object.keys(filterTest) as Filter[]).forEach((key) => {
      out[key] = all.filter((c) => filterTest[key](c, side)).length;
    });
    return out;
  }, [all, side]);
  const trimmed = query.trim();
  const shown = all.filter((c) => filterTest[filter](c, side) && matches(s, c, side, trimmed));
  const grid = wide ? "grid gap-2 md:grid-cols-2 xl:grid-cols-3" : "grid gap-2 md:grid-cols-2";

  const empty = emptyCopy(side, filter, counts);

  return (
    <section aria-label={side === "business" ? "Work you ordered" : "Work you're making"} className="flex flex-col">
      <div className={`flex flex-col gap-3 px-1 pb-3 ${wide ? "lg:flex-row" : "xl:flex-row"} lg:items-center lg:justify-between`}>
        <div
          role="group"
          aria-label="Filter commissions"
          className="y-scroll-x -mx-1 flex min-w-0 gap-1.5 px-1 lg:mx-0 lg:px-0"
        >
          {(Object.keys(filterLabels) as Filter[]).map((key) => (
            <FilterChip
              key={key}
              pressed={filter === key}
              onClick={() => setFilter(key)}
              count={hydrated ? counts[key] : undefined}
              className="flex-none"
            >
              {filterLabels[key]}
            </FilterChip>
          ))}
        </div>
        <label className={`relative block w-full ${wide ? "lg:max-w-sm" : "xl:w-52 xl:flex-none"}`}>
          <span className="sr-only">Search commissions</span>
          <Search
            size={18}
            aria-hidden
            className="y-fg-2 pointer-events-none absolute start-4 top-1/2 -translate-y-1/2"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={side === "business" ? "Search title, creator or product" : "Search title, client or product"}
            className="y-input !ps-11"
          />
        </label>
      </div>

      {!hydrated ? (
        <div className={grid} aria-busy="true" aria-label="Loading commissions">
          {[0, 1, 2].map((i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      ) : shown.length ? (
        <>
          <p className="sr-only" aria-live="polite">
            {plural(shown.length, "commission")} shown
          </p>
          <ul className={grid}>
            {shown.map((commission) => (
              <li key={commission.id} className="flex">
                <CommissionCard commission={commission} role={side} className="w-full" />
              </li>
            ))}
          </ul>
        </>
      ) : trimmed ? (
        <Block tone="paper" pad="md">
          <EmptyState
            title={`Nothing matches “${trimmed}”`}
            body={`Try a ${side === "business" ? "creator's" : "client's"} name, a product or a format like “selfie demo”.`}
            shape="bean"
            tint="sun"
            action={
              <PillButton variant="contrast" icon={<X size={18} aria-hidden />} onClick={() => setQuery("")}>
                Clear search
              </PillButton>
            }
          />
        </Block>
      ) : (
        <Block tone="paper" pad="md">
          <EmptyState
            title={empty.title}
            body={empty.body}
            shape={empty.shape}
            tint={empty.tint}
            face={empty.face}
            headingLevel={3}
            action={
              empty.action ? (
                empty.action.href ? (
                  <PillButton href={empty.action.href} variant="contrast">
                    {empty.action.label}
                  </PillButton>
                ) : (
                  <PillButton variant="contrast" onClick={() => setFilter(empty.action!.filter!)}>
                    {empty.action.label}
                  </PillButton>
                )
              ) : null
            }
          />
        </Block>
      )}
    </section>
  );
}

function emptyCopy(side: Role, filter: Filter, counts: Record<Filter, number>) {
  type Action = { label: string; href?: string; filter?: Filter };
  const find: Action =
    side === "business"
      ? { label: "Find a creator", href: paths.explore("creators") }
      : { label: "Find work", href: paths.explore("orders") };
  const fallback: Action = counts.all > 0 ? { label: "See all commissions", filter: "all" } : find;
  const base = { shape: "ball" as const, tint: "sea" as const, face: "focus" as const };
  switch (filter) {
    case "needs":
      return {
        ...base,
        face: "smile" as const,
        tint: "mint" as const,
        title: "Nothing needs you right now",
        body:
          side === "business"
            ? "When a creator delivers a video, it lands here for your review. We'll notify you too."
            : "New offers, work to deliver and videos to post show up here. You're all caught up.",
        action: counts.active ? ({ label: "See active work", filter: "active" } as Action) : fallback,
      };
    case "active":
      return {
        ...base,
        shape: "pill" as const,
        tint: "coral" as const,
        title: side === "business" ? "No commissions in progress" : "Nothing in production",
        body:
          side === "business"
            ? "Commission a creator from their profile or hire from a request's pitches. Payment is held until you approve."
            : "Take a campaign slot, pitch on a request or accept a direct offer. Your work shows up here.",
        action: find,
      };
    case "completed":
      return {
        ...base,
        shape: "tower" as const,
        tint: "sun" as const,
        title: "No completed commissions yet",
        body:
          side === "business"
            ? "Approved videos and their reviews collect here, ready to commission again."
            : "Approved work and paid commissions collect here.",
        action: fallback,
      };
    case "cancelled":
      return {
        ...base,
        shape: "dome" as const,
        tint: "violet" as const,
        face: "calm" as const,
        title: "Nothing cancelled",
        body: "Declined offers, cancelled commissions and campaign slots that ended show up here.",
        action: counts.all ? ({ label: "See all commissions", filter: "all" } as Action) : undefined,
      };
    default:
      return {
        ...base,
        title: "No commissions yet",
        body:
          side === "business"
            ? "Find a creator who speaks your audience's language and send an offer. You only pay when you approve."
            : "Once you take a slot, win a pitch or accept an offer, it lives here from brief to payment.",
        action: fallback,
      };
  }
}
