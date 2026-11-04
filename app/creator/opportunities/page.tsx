"use client";

import { Eye, EyeOff, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import {
  OpportunityFilters,
  type OpportunityFilterState,
} from "@/components/creator/opportunity-filters";
import { RequestCard } from "@/components/domain/request-card";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { JobCardSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { AppShell } from "@/components/shell/app-shell";
import { money, plural } from "@/lib/format";
import { useSimulatedLoading } from "@/lib/hooks";
import { businessById, opportunities, pitchesForCreator, productById } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";
import type { FormatId, LanguageId } from "@/lib/types";

type Tab = "for-you" | "invited" | "all" | "hidden";
type Sort = "fit" | "budget" | "newest" | "due";

const FIT_THRESHOLD = 60;

const sortOptions: { value: Sort; label: string }[] = [
  { value: "fit", label: "Best fit" },
  { value: "budget", label: "Highest budget" },
  { value: "newest", label: "Newest" },
  { value: "due", label: "Due soonest" },
];

export default function OpportunitiesPage() {
  return (
    <AppShell role="creator">
      <Opportunities />
    </AppShell>
  );
}

function Opportunities() {
  const s = useDemo();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("for-you");
  const [sort, setSort] = useState<Sort>("fit");
  const [query, setQuery] = useState("");
  const [formats, setFormats] = useState<FormatId[]>([]);
  const [dialects, setDialects] = useState<LanguageId[]>([]);
  /** null = follow the saved default from settings. */
  const [minBudgetOverride, setMinBudgetOverride] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const savedMinBudget = s.settings.creator.minBudget;
  const minBudget = minBudgetOverride ?? savedMinBudget;
  const filters: OpportunityFilterState = { formats, dialects, minBudget };
  const setFilters = (next: OpportunityFilterState) => {
    setFormats(next.formats);
    setDialects(next.dialects);
    setMinBudgetOverride(next.minBudget);
  };

  const all = useMemo(() => opportunities(s), [s]);
  const activePitches = pitchesForCreator(s).filter(
    (p) => p.status === "sent" || p.status === "viewed" || p.status === "shortlisted",
  ).length;

  const inTab = (t: Tab) =>
    all.filter((o) =>
      t === "hidden"
        ? o.hidden
        : !o.hidden &&
          (t === "invited" ? o.invited : t === "for-you" ? o.fit.score >= FIT_THRESHOLD : true),
    );
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "for-you", label: "For you", count: inTab("for-you").length },
    { id: "invited", label: "Invited", count: inTab("invited").length },
    { id: "all", label: "All open", count: inTab("all").length },
    { id: "hidden", label: "Hidden", count: inTab("hidden").length },
  ];

  const base = inTab(tab);
  const formatCounts = withSelected(countBy(base.map((o) => [o.request.brief.format])), formats);
  const dialectCounts = withSelected(countBy(base.map((o) => o.request.brief.languages)), dialects);

  const q = query.trim().toLowerCase();
  const results = base
    .filter((o) => !formats.length || formats.includes(o.request.brief.format))
    .filter((o) => !dialects.length || o.request.brief.languages.some((l) => dialects.includes(l)))
    .filter((o) => o.request.budget.max >= minBudget)
    .filter((o) => {
      if (!q) return true;
      const business = businessById(s, o.request.businessId);
      const product = productById(s, o.request.brief.productId);
      return [o.request.title, business?.name, product?.name, formatById[o.request.brief.format].name, o.request.brief.keyMessage]
        .filter(Boolean)
        .some((text) => (text ?? "").toLowerCase().includes(q));
    })
    .sort((a, b) => {
      switch (sort) {
        case "budget":
          return b.request.budget.max - a.request.budget.max || b.fit.score - a.fit.score;
        case "newest":
          return Date.parse(b.request.postedAt) - Date.parse(a.request.postedAt);
        case "due":
          return Date.parse(a.request.dueDate) - Date.parse(b.request.dueDate);
        case "fit":
        default:
          return b.fit.score - a.fit.score || Number(b.invited) - Number(a.invited);
      }
    });

  const activeFilterCount = formats.length + dialects.length + (minBudget !== savedMinBudget ? 1 : 0);
  const loadingKey = JSON.stringify([tab, sort, formats, dialects, minBudget]);
  const loading = useSimulatedLoading(loadingKey, 380);

  const clearFilters = () => {
    setFormats([]);
    setDialects([]);
    setMinBudgetOverride(null);
    setQuery("");
  };

  const hide = (id: string, title: string) => {
    actions.hideRequest(id);
    toast({
      message: `Hid "${title}" from your feed.`,
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
          ? `Saved. Your feed and match alerts now start at ${money(amount)}.`
          : "Saved. Your feed shows every budget.",
    });
  };

  const filterPanel = (
    <OpportunityFilters
      value={filters}
      onChange={setFilters}
      formatCounts={formatCounts}
      dialectCounts={dialectCounts}
      savedMinBudget={savedMinBudget}
      onSaveMinBudget={saveDefault}
    />
  );

  return (
    <Page>
      <PageHeader
        title="Opportunities"
        description="Open requests from businesses that need what you make."
        actions={
          <PillButton href="/creator/pitches" variant="outline">
            My pitches{activePitches ? ` · ${activePitches} active` : ""}
          </PillButton>
        }
      />

      {/* One quiet row: what to show, search, sort, and the rest of the filters in a sheet. */}
      <div data-tone="canvas" className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="y-scroll-x -mx-1 px-1 lg:flex-1">
          <div className="flex w-max gap-2" role="group" aria-label="Show">
            {tabs.map((t) => (
              <FilterChip key={t.id} pressed={tab === t.id} count={t.count} onClick={() => setTab(t.id)}>
                {t.label}
              </FilterChip>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1 lg:w-72 lg:flex-none">
            <span className="sr-only">Search requests</span>
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
          <div className="flex gap-2">
            <label className="flex-1 sm:w-44 sm:flex-none">
              <span className="sr-only">Sort by</span>
              <select className="y-input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <PillButton
              variant={activeFilterCount ? "contrast" : "soft"}
              className="!min-h-[52px]"
              icon={<SlidersHorizontal size={18} aria-hidden />}
              onClick={() => setSheetOpen(true)}
              aria-label={`Filters${activeFilterCount ? `, ${activeFilterCount} active` : ""}`}
            >
              Filters{activeFilterCount ? ` · ${activeFilterCount}` : ""}
            </PillButton>
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-2" aria-label="Requests">
        <p className="y-small y-fg-2 px-2 pt-2" aria-live="polite">
          {loading
            ? "Loading requests…"
            : `${plural(results.length, "request")}${tab === "for-you" ? ` with ${FIT_THRESHOLD}%+ fit` : ""}`}
        </p>

        {loading ? (
          <div className="grid gap-2 md:grid-cols-2" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        ) : results.length ? (
          <ul className="grid gap-2 md:grid-cols-2">
            {results.map((o) => (
              <li key={o.request.id} className="relative">
                <RequestCard
                  request={o.request}
                  perspective="creator"
                  href={`/creator/opportunities/${o.request.id}`}
                  fit={o.fit}
                  pitch={o.pitch}
                  invited={o.invited}
                  className="h-full !pb-[68px] md:!pb-[72px]"
                />
                <div className="pointer-events-none absolute inset-x-5 bottom-3 flex justify-end md:inset-x-6 md:bottom-4">
                  {o.hidden ? (
                    <PillButton
                      size="sm"
                      variant="ghost"
                      className="pointer-events-auto relative z-[3]"
                      icon={<Eye size={16} aria-hidden />}
                      onClick={() => unhide(o.request.id)}
                      aria-label={`Unhide ${o.request.title}`}
                    >
                      Unhide
                    </PillButton>
                  ) : (
                    <PillButton
                      size="sm"
                      variant="ghost"
                      className="pointer-events-auto relative z-[3]"
                      icon={<EyeOff size={16} aria-hidden />}
                      onClick={() => hide(o.request.id, o.request.title)}
                      aria-label={`Hide ${o.request.title}`}
                    >
                      Hide
                    </PillButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Block tone="paper" pad="md">
            <EmptyForTab
              tab={tab}
              filtered={activeFilterCount > 0 || q.length > 0 || (minBudget > 0 && base.length > 0)}
              minBudget={minBudget}
              onClear={clearFilters}
              onAnyBudget={() => setMinBudgetOverride(0)}
              onShowAll={() => setTab("all")}
            />
          </Block>
        )}
      </section>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
        footer={
          <div className="flex gap-2">
            <PillButton variant="ghost" onClick={clearFilters} disabled={!activeFilterCount}>
              Clear all
            </PillButton>
            <PillButton variant="contrast" className="flex-1" onClick={() => setSheetOpen(false)}>
              Show {plural(results.length, "request")}
            </PillButton>
          </div>
        }
      >
        {filterPanel}
      </Sheet>
    </Page>
  );
}

function EmptyForTab({
  tab,
  filtered,
  minBudget,
  onClear,
  onAnyBudget,
  onShowAll,
}: {
  tab: Tab;
  filtered: boolean;
  minBudget: number;
  onClear: () => void;
  onAnyBudget: () => void;
  onShowAll: () => void;
}) {
  if (filtered) {
    return (
      <EmptyState
        title="Nothing matches these filters"
        body={`Try fewer formats or dialects${minBudget > 0 ? `, or a minimum budget below ${money(minBudget)}` : ""}. New requests are posted every day.`}
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
  switch (tab) {
    case "for-you":
      return (
        <EmptyState
          title="No strong matches right now"
          body={`Requests with ${FIT_THRESHOLD}%+ fit land here. Adding formats or dialects to your profile widens what fits you.`}
          shape="dome"
          tint="violet"
          action={
            <PillButton variant="contrast" onClick={onShowAll}>
              See all open requests
            </PillButton>
          }
        />
      );
    case "invited":
      return (
        <EmptyState
          title="No invites yet"
          body="Businesses invite creators whose samples look like what they need. A featured video and 5+ samples help you get picked."
          shape="bean"
          tint="mint"
          action={
            <PillButton href="/creator/profile#portfolio" variant="contrast">
              Polish your portfolio
            </PillButton>
          }
        />
      );
    case "hidden":
      return (
        <EmptyState
          title="Nothing hidden"
          body="Hide requests that aren't for you and they'll wait here in case you change your mind."
          shape="pill"
          tint="coral"
          face="sleepy"
        />
      );
    case "all":
    default:
      return (
        <EmptyState
          title="No open requests right now"
          body="New requests are posted every day. Turn on match alerts in settings and we'll tell you first."
          shape="tower"
          tint="sun"
          action={
            <PillButton href="/creator/settings" variant="contrast">
              Set up match alerts
            </PillButton>
          }
        />
      );
  }
}

/** Keep selected options visible (with a zero count) so they can always be turned off. */
function withSelected<T extends string>(counts: [T, number][], selected: T[]): [T, number][] {
  const missing = selected.filter((id) => !counts.some(([c]) => c === id));
  return [...counts, ...missing.map((id): [T, number] => [id, 0])];
}

/** Count occurrences across lists, most common first. */
function countBy<T extends string>(lists: T[][]): [T, number][] {
  const map = new Map<T, number>();
  for (const list of lists) for (const item of list) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}
