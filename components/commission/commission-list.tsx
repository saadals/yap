"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { CommissionCard } from "@/components/domain/commission-card";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { JobCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { daysFromNow, plural } from "@/lib/format";
import {
  businessById,
  businessSpend,
  commissionsForBusiness,
  commissionsForCreator,
  creatorById,
  creatorEarnings,
  isActive,
  needsAction,
  productById,
} from "@/lib/selectors";
import { type DemoState, useDemo, useHydrated } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";
import type { Commission, Role } from "@/lib/types";

import { cash } from "./helpers";

type Filter = "needs" | "active" | "completed" | "cancelled" | "all";

const filterTest: Record<Filter, (c: Commission, role: Role) => boolean> = {
  needs: (c, role) => needsAction(c, role),
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

function matches(s: DemoState, c: Commission, role: Role, query: string) {
  if (!query) return true;
  const other =
    role === "business" ? creatorById(s, c.creatorId)?.name : businessById(s, c.businessId)?.name;
  const haystack = [
    c.title,
    c.id,
    other,
    productById(s, c.brief.productId)?.name,
    formatById[c.brief.format]?.name,
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

/** Commissions list for either side: KPIs, filter chips with counts, search, card grid. */
export function CommissionList({ role }: { role: Role }) {
  const s = useDemo();
  const hydrated = useHydrated();
  const [filter, setFilter] = useState<Filter>("active");
  const [query, setQuery] = useState("");

  const all = useMemo(
    () => (role === "business" ? commissionsForBusiness(s) : commissionsForCreator(s)),
    [s, role],
  );
  const counts = useMemo(() => {
    const out = {} as Record<Filter, number>;
    (Object.keys(filterTest) as Filter[]).forEach((key) => {
      out[key] = all.filter((c) => filterTest[key](c, role)).length;
    });
    return out;
  }, [all, role]);
  const trimmed = query.trim();
  const shown = all.filter((c) => filterTest[filter](c, role) && matches(s, c, role, trimmed));

  const kpis =
    role === "business"
      ? (() => {
          const spend = businessSpend(s);
          return [
            {
              tone: "night" as const,
              label: "In production",
              value: String(all.filter((c) => c.status === "in_progress" || c.status === "revision").length),
              sub: "Creators working on them now",
            },
            {
              tone: "paper" as const,
              label: "Waiting for your review",
              value: String(counts.needs),
              sub: counts.needs ? "Auto-approves 3 days after delivery" : "You're all caught up",
            },
            {
              tone: "sky" as const,
              label: "Total protected",
              value: cash(spend.held),
              sub: spend.authorized
                ? `Held until you approve · ${cash(spend.authorized)} authorised on offers`
                : "Held until you approve each video",
            },
          ];
        })()
      : (() => {
          const earnings = creatorEarnings(s);
          const dueThisWeek = all.filter(
            (c) => (c.status === "in_progress" || c.status === "revision") && daysFromNow(c.dueDate) <= 7,
          );
          const late = dueThisWeek.filter((c) => daysFromNow(c.dueDate) < 0).length;
          return [
            {
              tone: "night" as const,
              label: "Due this week",
              value: String(dueThisWeek.length),
              sub: late ? `${plural(late, "delivery", "deliveries")} past due` : "Videos to deliver in the next 7 days",
            },
            {
              tone: "paper" as const,
              label: "In review",
              value: String(all.filter((c) => c.status === "delivered").length),
              sub: "Waiting for clients to approve",
            },
            {
              tone: "butter" as const,
              label: "Earnings held",
              value: cash(earnings.held),
              sub: "Paid to you when clients approve",
            },
          ];
        })();

  const empty = emptyCopy(role, filter, counts);

  return (
    <Page>
      <PageHeader
        title="Commissions"
        description={
          role === "business"
            ? "Every video you've commissioned, from offer to approved. Payment stays protected until you approve."
            : "Your client work in one place. Accept offers, deliver versions and get paid when clients approve."
        }
        actions={
          role === "business" ? (
            <PillButton href="/creators" variant="neon" arrow>
              Commission a creator
            </PillButton>
          ) : (
            <PillButton href="/creator/opportunities" variant="neon" arrow>
              Find new work
            </PillButton>
          )
        }
      />

      <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3" aria-label="Summary">
        {kpis.map((kpi, index) => (
          <li key={kpi.label} className={index === 2 ? "col-span-2 lg:col-span-1" : ""}>
            <Block tone={kpi.tone} pad="md" className="flex h-full flex-col justify-between gap-5">
              <span className="y-small font-semibold">{kpi.label}</span>
              <div>
                {hydrated ? (
                  <p className="y-display y-num text-[44px] leading-none font-semibold tracking-[-0.04em]">
                    {kpi.value}
                  </p>
                ) : (
                  <Skeleton className="h-11 w-24" />
                )}
                <p className="y-micro y-fg-2 mt-2">{kpi.sub}</p>
              </div>
            </Block>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 px-1 pt-8 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label="Filter commissions"
          className="y-scroll-x -mx-1 flex gap-1.5 px-1 lg:mx-0 lg:px-0"
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
        <label className="relative block w-full lg:max-w-sm">
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
            placeholder={role === "business" ? "Search title, creator or product" : "Search title, client or product"}
            className="y-input !ps-11"
          />
        </label>
      </div>

      {!hydrated ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading commissions">
          {[0, 1, 2].map((i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      ) : shown.length ? (
        <>
          <p className="sr-only" aria-live="polite">
            {plural(shown.length, "commission")} shown
          </p>
          <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((commission) => (
              <li key={commission.id} className="flex">
                <CommissionCard commission={commission} role={role} className="w-full" />
              </li>
            ))}
          </ul>
        </>
      ) : trimmed ? (
        <Block tone="paper" pad="md">
          <EmptyState
            title={`Nothing matches “${trimmed}”`}
            body={`Try a ${role === "business" ? "creator's" : "client's"} name, a product or a format like “selfie demo”.`}
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
    </Page>
  );
}

function emptyCopy(role: Role, filter: Filter, counts: Record<Filter, number>) {
  type Action = { label: string; href?: string; filter?: Filter };
  const fallback: Action | undefined =
    counts.all > 0
      ? { label: "See all commissions", filter: "all" }
      : role === "business"
        ? { label: "Find a creator", href: "/creators" }
        : { label: "Browse opportunities", href: "/creator/opportunities" };
  const base = { shape: "ball" as const, tint: "sea" as const, face: "focus" as const };
  switch (filter) {
    case "needs":
      return {
        ...base,
        face: "smile" as const,
        tint: "mint" as const,
        title: "Nothing needs you right now",
        body:
          role === "business"
            ? "When a creator delivers a video, it lands here for your review. We'll notify you too."
            : "New offers and work to deliver show up here. You're all caught up.",
        action: counts.active ? ({ label: "See active work", filter: "active" } as Action) : fallback,
      };
    case "active":
      return {
        ...base,
        shape: "pill" as const,
        tint: "coral" as const,
        title: role === "business" ? "No commissions in progress" : "No active client work",
        body:
          role === "business"
            ? "Commission a creator from their profile or hire from a request's pitches. Payment is held until you approve."
            : "Pitch on open requests or wait for a direct offer. Accepted work shows up here.",
        action:
          role === "business"
            ? ({ label: "Find a creator", href: "/creators" } as Action)
            : ({ label: "Browse opportunities", href: "/creator/opportunities" } as Action),
      };
    case "completed":
      return {
        ...base,
        shape: "tower" as const,
        tint: "sun" as const,
        title: "No completed commissions yet",
        body:
          role === "business"
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
        body: "Declined offers and cancelled commissions show up here, along with their refunds.",
        action: counts.all ? ({ label: "See all commissions", filter: "all" } as Action) : undefined,
      };
    default:
      return {
        ...base,
        title: "No commissions yet",
        body:
          role === "business"
            ? "Find a creator who speaks your audience's language and send an offer. You only pay when you approve."
            : "Once a client hires you or you accept an offer, it lives here from brief to payment.",
        action: fallback,
      };
  }
}
