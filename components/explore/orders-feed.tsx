"use client";

import { Check, Eye, EyeOff, Search, SlidersHorizontal, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

import { CreatorSetupSheet } from "@/components/account/creator-setup-sheet";
import { OpportunityFilters, type OpportunityFilterState } from "@/components/creator/opportunity-filters";
import { RequestCard } from "@/components/domain/request-card";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionLabel } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { JobCardSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { money, plural } from "@/lib/format";
import { useSimulatedLoading } from "@/lib/hooks";
import { paths } from "@/lib/paths";
import { businessById, me, openCampaigns, opportunities, productById } from "@/lib/selectors";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";
import type { ContentRequest, FormatId, LanguageId } from "@/lib/types";

import {
  campaignNote,
  countBy,
  openPublicRequests,
  withSelected,
  type CampaignItem,
  type RequestItem,
} from "./orders-data";

type View = "all" | "campaigns" | "requests" | "hidden";
type Sort = "fit" | "budget" | "newest" | "due";

const sortOptions: { value: Sort; label: string; needsProfile?: boolean }[] = [
  { value: "fit", label: "Best fit", needsProfile: true },
  { value: "budget", label: "Highest budget" },
  { value: "newest", label: "Newest" },
  { value: "due", label: "Due soonest" },
];

/**
 * Explore → Orders: open UGC campaigns (take a slot) and custom requests (pitch), as quiet cards.
 * Campaigns the viewer can take come first; the rest stay visible with one line on who they're
 * for. Format, language and budget filters narrow custom requests.
 */
export function OrdersFeed() {
  const hydrated = useHydrated();
  // The signed-in account decides what's eligible and what's hidden: wait for the saved state.
  if (!hydrated) return <FeedSkeleton />;
  return <Feed />;
}

function FeedSkeleton() {
  return (
    <div className="grid gap-2 md:grid-cols-2" aria-busy="true" aria-label="Loading orders">
      {Array.from({ length: 4 }, (_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}

function Feed() {
  const s = useDemo();
  const toast = useToast();
  const creator = me.creator(s);
  const [view, setView] = useState<View>("all");
  const [sort, setSort] = useState<Sort>(creator ? "fit" : "newest");
  const [query, setQuery] = useState("");
  const [formats, setFormats] = useState<FormatId[]>([]);
  const [langs, setLangs] = useState<LanguageId[]>([]);
  /** null = follow the saved default from settings. */
  const [minBudgetOverride, setMinBudgetOverride] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  const savedMinBudget = me.settings(s).creator.minBudget;
  const minBudget = minBudgetOverride ?? savedMinBudget;
  const filters: OpportunityFilterState = { formats, languages: langs, minBudget };
  const setFilters = (next: OpportunityFilterState) => {
    setFormats(next.formats);
    setLangs(next.languages);
    setMinBudgetOverride(next.minBudget);
  };
  // "Best fit" needs a creator profile to measure against.
  const activeSort: Sort = sort === "fit" && !creator ? "newest" : sort;

  const allCampaigns: CampaignItem[] = useMemo(
    // Full campaigns drop out unless the viewer holds a slot in one.
    () => openCampaigns(s).filter((c) => c.openSlots > 0 || c.slot),
    [s],
  );
  const allRequests: RequestItem[] = useMemo(
    () => (creator ? opportunities(s) : openPublicRequests(s)),
    [s, creator],
  );

  const hiddenCount =
    allCampaigns.filter((c) => c.hidden).length + allRequests.filter((r) => r.hidden).length;
  const showCampaigns = view !== "requests";
  const showRequests = view !== "campaigns";
  const inView = <T extends { hidden: boolean }>(list: T[]) =>
    list.filter((item) => (view === "hidden" ? item.hidden : !item.hidden));

  const baseRequests = showRequests ? inView(allRequests) : [];
  const formatCounts = withSelected(countBy(baseRequests.map((o) => [o.request.brief.format])), formats);
  const languageCounts = withSelected(countBy(baseRequests.map((o) => o.request.brief.languages)), langs);

  const q = query.trim().toLowerCase();
  const matchesQuery = (request: ContentRequest) => {
    if (!q) return true;
    const business = businessById(s, request.businessId);
    const product = productById(s, request.brief.productId);
    return [request.title, business?.name, product?.name, formatById[request.brief.format]?.name, request.brief.keyMessage]
      .filter(Boolean)
      .some((text) => (text ?? "").toLowerCase().includes(q));
  };

  const campaigns = (showCampaigns ? inView(allCampaigns) : []).filter((c) => matchesQuery(c.request));
  const requests = baseRequests
    .filter((o) => !formats.length || formats.includes(o.request.brief.format))
    .filter((o) => !langs.length || o.request.brief.languages.some((l) => langs.includes(l)))
    .filter((o) => o.request.budget.max >= minBudget)
    .filter((o) => matchesQuery(o.request))
    .sort((a, b) => {
      switch (activeSort) {
        case "budget":
          return b.request.budget.max - a.request.budget.max || (b.fit?.score ?? 0) - (a.fit?.score ?? 0);
        case "newest":
          return Date.parse(b.request.postedAt) - Date.parse(a.request.postedAt);
        case "due":
          return Date.parse(a.request.dueDate) - Date.parse(b.request.dueDate);
        case "fit":
        default:
          return Number(b.invited) - Number(a.invited) || (b.fit?.score ?? 0) - (a.fit?.score ?? 0);
      }
    });

  const requestFilterCount = formats.length + langs.length + (minBudget !== savedMinBudget ? 1 : 0);
  const loadingKey = JSON.stringify([view, activeSort, formats, langs, minBudget]);
  const loading = useSimulatedLoading(loadingKey, 380);

  const clearFilters = () => {
    setFormats([]);
    setLangs([]);
    setMinBudgetOverride(null);
    setQuery("");
  };

  const hide = (id: string, title: string) => {
    actions.hideRequest(id);
    toast({
      message: `Hid "${title}" from your feed and Discover.`,
      action: { label: "Undo", onClick: () => actions.unhideRequest(id) },
    });
  };
  const unhide = (id: string) => {
    actions.unhideRequest(id);
    toast({
      message: "Back in your feed.",
      action: { label: "Undo", onClick: () => actions.hideRequest(id) },
    });
  };

  const saveDefault = (amount: number) => {
    actions.updateSettings("creator", { minBudget: amount });
    setMinBudgetOverride(null);
    toast({
      message:
        amount > 0
          ? `Saved. Discover and match alerts now start at ${money(amount)}.`
          : "Saved. Discover shows every budget.",
    });
  };

  const visibleCampaigns = allCampaigns.filter((c) => !c.hidden).length;
  const visibleRequests = allRequests.filter((r) => !r.hidden).length;
  const views: { id: View; label: string; count: number }[] = [
    { id: "all", label: "All", count: visibleCampaigns + visibleRequests },
    { id: "campaigns", label: "Campaigns", count: visibleCampaigns },
    { id: "requests", label: "Requests", count: visibleRequests },
    ...(hiddenCount || view === "hidden" ? [{ id: "hidden" as const, label: "Hidden", count: hiddenCount }] : []),
  ];
  const total = campaigns.length + requests.length;
  const labelled = showCampaigns && showRequests && campaigns.length > 0 && requests.length > 0;
  const filtered = requestFilterCount > 0 || q.length > 0;

  const hideButton = (request: ContentRequest, hidden: boolean) =>
    hidden ? (
      <PillButton
        size="sm"
        variant="ghost"
        className="pointer-events-auto relative z-[3] ms-auto"
        icon={<Eye size={16} aria-hidden />}
        onClick={() => unhide(request.id)}
        aria-label={`Unhide ${request.title}`}
      >
        Unhide
      </PillButton>
    ) : (
      <PillButton
        size="sm"
        variant="ghost"
        className="pointer-events-auto relative z-[3] ms-auto"
        icon={<EyeOff size={16} aria-hidden />}
        onClick={() => hide(request.id, request.title)}
        aria-label={`Not interested in ${request.title}`}
      >
        Hide
      </PillButton>
    );

  return (
    <div className="flex flex-col gap-2">
      {!creator ? (
        <Block tone="paper" pad="sm" className="flex flex-wrap items-center gap-3 !py-3 !ps-5">
          <UserRound size={18} aria-hidden className="flex-none" />
          <p className="y-small min-w-0 flex-1 font-medium">Set up a creator profile to pitch or take slots</p>
          <PillButton size="sm" variant="contrast" onClick={() => setSetupOpen(true)}>
            Set up
          </PillButton>
        </Block>
      ) : null}

      {/* One quiet row: what to show, search, sort, and the request filters in a sheet. */}
      <div data-tone="canvas" className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="y-scroll-x -mx-1 px-1 lg:flex-1">
          <div className="flex w-max gap-2" role="group" aria-label="Show">
            {views.map((v) => (
              <FilterChip key={v.id} pressed={view === v.id} count={v.count} onClick={() => setView(v.id)}>
                {v.label}
              </FilterChip>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1 lg:w-72 lg:flex-none">
            <span className="sr-only">Search orders</span>
            <Search
              size={18}
              aria-hidden
              className="y-fg-2 pointer-events-none absolute start-5 top-1/2 -translate-y-1/2"
            />
            <input
              type="search"
              className="y-input ps-12"
              placeholder="Search by app or business"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {showRequests ? (
            <div className="flex gap-2">
              <label className="flex-1 sm:w-44 sm:flex-none">
                <span className="sr-only">Sort requests by</span>
                <select className="y-input" value={activeSort} onChange={(e) => setSort(e.target.value as Sort)}>
                  {sortOptions
                    .filter((o) => !o.needsProfile || creator)
                    .map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                </select>
              </label>
              <PillButton
                variant={requestFilterCount ? "contrast" : "soft"}
                className="!min-h-[52px]"
                icon={<SlidersHorizontal size={18} aria-hidden />}
                onClick={() => setSheetOpen(true)}
                aria-label={`Request filters${requestFilterCount ? `, ${requestFilterCount} active` : ""}`}
              >
                Filters{requestFilterCount ? ` · ${requestFilterCount}` : ""}
              </PillButton>
            </div>
          ) : null}
        </div>
      </div>

      <p className="y-small y-fg-2 px-2 pt-2" aria-live="polite">
        {loading
          ? "Loading orders…"
          : [
              showCampaigns ? plural(campaigns.length, "campaign") : null,
              showRequests ? plural(requests.length, "request") : null,
            ]
              .filter(Boolean)
              .join(" · ")}
      </p>

      {loading ? (
        <FeedSkeleton />
      ) : total === 0 ? (
        <Block tone="paper" pad="md">
          <FeedEmpty
            view={view}
            filtered={filtered || (minBudget > 0 && baseRequests.length > 0 && view !== "campaigns")}
            minBudget={minBudget}
            onClear={clearFilters}
            onAnyBudget={() => setMinBudgetOverride(0)}
            onShowAll={() => setView("all")}
          />
        </Block>
      ) : (
        <>
          {campaigns.length ? (
            <section className="flex flex-col gap-2" aria-label="UGC campaigns">
              {labelled ? <SectionLabel className="!pt-2">UGC campaigns</SectionLabel> : null}
              <ul className="grid gap-2 md:grid-cols-2">
                {campaigns.map((c) => {
                  const note = campaignNote(c);
                  return (
                    <li key={c.request.id} className="relative">
                      <RequestCard
                        request={c.request}
                        perspective="creator"
                        href={paths.order(c.request.id)}
                        className="h-full !pb-[68px] md:!pb-[72px]"
                      />
                      <div className="pointer-events-none absolute inset-x-5 bottom-3 flex items-center gap-2 md:inset-x-6 md:bottom-4">
                        {note ? (
                          <p className="y-micro y-fg-2 flex min-w-0 items-center gap-1.5">
                            {c.slot ? <Check size={14} aria-hidden className="flex-none" /> : null}
                            <span className="truncate">{note}</span>
                          </p>
                        ) : null}
                        {c.slot ? null : hideButton(c.request, c.hidden)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {requests.length ? (
            <section className="flex flex-col gap-2" aria-label="Custom requests">
              {labelled ? <SectionLabel>Custom requests</SectionLabel> : null}
              <ul className="grid gap-2 md:grid-cols-2">
                {requests.map((o) => (
                  <li key={o.request.id} className="relative">
                    <RequestCard
                      request={o.request}
                      perspective="creator"
                      href={paths.order(o.request.id)}
                      fit={o.fit}
                      pitch={o.pitch}
                      invited={o.invited}
                      className="h-full !pb-[68px] md:!pb-[72px]"
                    />
                    <div className="pointer-events-none absolute inset-x-5 bottom-3 flex justify-end md:inset-x-6 md:bottom-4">
                      {o.pitch ? null : hideButton(o.request, o.hidden)}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filter requests"
        description="Campaigns aren't affected: they're priced by follower tier."
        footer={
          <div className="flex gap-2">
            <PillButton variant="ghost" onClick={clearFilters} disabled={!requestFilterCount}>
              Clear all
            </PillButton>
            <PillButton variant="contrast" className="flex-1" onClick={() => setSheetOpen(false)}>
              Show {plural(requests.length, "request")}
            </PillButton>
          </div>
        }
      >
        <OpportunityFilters
          value={filters}
          onChange={setFilters}
          formatCounts={formatCounts}
          languageCounts={languageCounts}
          savedMinBudget={savedMinBudget}
          onSaveMinBudget={saveDefault}
        />
      </Sheet>

      {setupOpen ? (
        <CreatorSetupSheet
          open
          reason="to pitch on requests and take campaign slots"
          onClose={() => setSetupOpen(false)}
          onDone={() => setSetupOpen(false)}
        />
      ) : null}
    </div>
  );
}

function FeedEmpty({
  view,
  filtered,
  minBudget,
  onClear,
  onAnyBudget,
  onShowAll,
}: {
  view: View;
  filtered: boolean;
  minBudget: number;
  onClear: () => void;
  onAnyBudget: () => void;
  onShowAll: () => void;
}) {
  if (filtered && view !== "hidden") {
    return (
      <EmptyState
        title="Nothing matches these filters"
        body={`Try fewer formats or languages${minBudget > 0 ? `, or a minimum budget below ${money(minBudget)}` : ""}. New orders are posted every day.`}
        shape="ball"
        tint="sea"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <PillButton variant="contrast" onClick={onClear}>
              Clear filters
            </PillButton>
            {minBudget > 0 ? (
              <PillButton variant="outline" onClick={onAnyBudget}>
                Show any budget
              </PillButton>
            ) : null}
          </div>
        }
      />
    );
  }
  switch (view) {
    case "hidden":
      return (
        <EmptyState
          title="Nothing hidden"
          body="Hide orders that aren't for you and they'll wait here in case you change your mind."
          shape="pill"
          tint="coral"
          face="sleepy"
          action={
            <PillButton variant="contrast" onClick={onShowAll}>
              See all orders
            </PillButton>
          }
        />
      );
    case "campaigns":
      return (
        <EmptyState
          title="No open campaigns right now"
          body="Campaigns fill fast, first come, first served. New ones show up here and in your feed."
          shape="tower"
          tint="sun"
          action={
            <PillButton variant="contrast" onClick={onShowAll}>
              See all orders
            </PillButton>
          }
        />
      );
    case "requests":
      return (
        <EmptyState
          title="No open requests right now"
          body="New requests are posted every day. Turn on match alerts in settings and we'll tell you first."
          shape="tower"
          tint="sun"
          action={
            <PillButton href={paths.settings()} variant="contrast">
              Set up match alerts
            </PillButton>
          }
        />
      );
    case "all":
    default:
      return (
        <EmptyState
          title="No open orders right now"
          body="New campaigns and requests are posted every day. Turn on match alerts in settings and we'll tell you first."
          shape="tower"
          tint="sun"
          action={
            <PillButton href={paths.settings()} variant="contrast">
              Set up match alerts
            </PillButton>
          }
        />
      );
  }
}
