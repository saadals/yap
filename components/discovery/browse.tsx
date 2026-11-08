"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { CreatorCard } from "@/components/domain/creator-card";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { useSimulatedLoading } from "@/lib/hooks";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { useDemo } from "@/lib/store";
import { plural } from "@/lib/format";
import { languages } from "@/lib/taxonomy";
import type { FormatId, LanguageId } from "@/lib/types";

import {
  type BrowseFilters,
  type SortId,
  activeChips,
  emptyFilters,
  filterCreators,
  parseFilters,
  sheetFilterCount,
  sortOptions,
  toQuery,
} from "./browse-filters";
import { CategoryBar } from "./category-bar";
import { FilterSheet } from "./filter-sheet";
import { CreatorGridSkeleton } from "./skeletons";

/**
 * Creator discovery: search, formats, filters, sort and results. Public at `paths.creators`;
 * `embedded` renders it inside Explore's Creators tab (no page header of its own, and filter
 * changes stay on the Explore URL).
 */
export function Browse({ embedded = false }: { embedded?: boolean }) {
  const s = useDemo();
  const { account } = usePrefs();
  const router = useRouter();
  const params = useSearchParams();
  const urlFilters = useMemo(() => parseFilters(params), [params]);
  const resultsRef = useRef<HTMLHeadingElement>(null);

  // Search text filters live but only reaches the URL on submit/blur (or with any other filter
  // change), so typing never races the router. It follows the URL when that changes elsewhere.
  const [q, setQ] = useState(urlFilters.q);
  const [seenQ, setSeenQ] = useState(urlFilters.q);
  if (urlFilters.q !== seenQ) {
    setSeenQ(urlFilters.q);
    setQ(urlFilters.q);
  }
  const filters: BrowseFilters = useMemo(() => ({ ...urlFilters, q }), [urlFilters, q]);

  const commit = (next: BrowseFilters) => {
    setQ(next.q);
    const query = toQuery(next);
    const href = embedded
      ? `${paths.explore("creators")}${query ? `&${query}` : ""}`
      : `${paths.creators}${query ? `?${query}` : ""}`;
    router.replace(href, { scroll: false });
  };

  const results = useMemo(() => filterCreators(s, filters), [s, filters]);
  const loading = useSimulatedLoading(toQuery(filters, { includeQ: false }));
  const chips = activeChips(filters);
  const sheetCount = sheetFilterCount(filters);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<BrowseFilters>(filters);
  const openSheet = () => {
    setDraft(filters);
    setSheetOpen(true);
  };

  const dialectValue = filters.langs.length === 1 ? filters.langs[0] : filters.langs.length > 1 ? "multi" : "";
  const cityCount = new Set(s.creators.map((c) => c.cityId)).size;
  const signedIn = Boolean(account);

  const clearAll = () => commit({ ...emptyFilters, sort: filters.sort });

  return (
    <div className="flex flex-col gap-2">
      {embedded ? null : (
        <PageHeader
          className="!pb-3 md:!pb-4"
          title="Find creators"
          description={`${plural(s.creators.length, "ID-verified creator")} in ${cityCount} cities. Your payment is held until you approve.`}
        />
      )}

      {/* Search, then formats + filters + sort: one block */}
      <Block tone="paper" pad="none" className="flex flex-col">
        <form
          role="search"
          aria-label="Search creators"
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 p-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:p-4"
          onSubmit={(event) => {
            event.preventDefault();
            commit(filters);
            resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            resultsRef.current?.focus({ preventScroll: true });
          }}
        >
          <label className="relative block">
            <span className="sr-only">Search</span>
            <Search
              size={20}
              aria-hidden
              className="y-fg-2 pointer-events-none absolute start-5 top-1/2 -translate-y-1/2"
            />
            <input
              type="search"
              className="y-input ps-13"
              placeholder="Name, @handle or niche"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              onBlur={() => {
                if (q.trim() !== urlFilters.q) commit(filters);
              }}
            />
          </label>
          {/* Phones pick dialects in Filters, keeping the search to one row */}
          <label className="hidden min-w-0 md:block">
            <span className="sr-only">Dialect</span>
            <select
              className="y-input"
              value={dialectValue}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "multi") return;
                commit({ ...filters, langs: value ? [value as LanguageId] : [] });
              }}
            >
              <option value="">Any dialect</option>
              {filters.langs.length > 1 ? (
                <option value="multi" disabled>
                  {filters.langs.length} dialects selected
                </option>
              ) : null}
              {languages.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.id === "en" ? lang.name : `${lang.short} · ${lang.native}`}
                </option>
              ))}
            </select>
          </label>
          <PillButton type="submit" variant="neon" size="lg" arrow className="max-md:!gap-0 max-md:!px-1.5 md:min-w-36">
            <span className="max-md:sr-only">Search</span>
          </PillButton>
        </form>

        <div className="flex flex-col border-t border-(--b-line) lg:flex-row lg:items-center">
          <CategoryBar
            className="min-w-0 flex-1 px-2 pt-1"
            value={filters.format}
            onChange={(format: FormatId | null) => commit({ ...filters, format })}
          />
          <div className="flex flex-wrap items-center gap-2 border-t border-(--b-line) px-4 py-3 lg:flex-none lg:border-t-0 lg:border-s">
            <button
              type="button"
              className="y-filter"
              aria-pressed={sheetCount > 0}
              aria-haspopup="dialog"
              onClick={openSheet}
            >
              <SlidersHorizontal size={18} aria-hidden />
              <span>Filters</span>
              {sheetCount ? (
                <span className="y-count">
                  {sheetCount}
                  <span className="sr-only"> active</span>
                </span>
              ) : null}
            </button>
            <label className="ms-auto flex items-center gap-2">
              <span className="y-small y-fg-2 font-medium">Sort</span>
              <select
                className="y-input !min-h-11 !w-auto !text-sm font-semibold"
                value={filters.sort}
                onChange={(event) => commit({ ...filters, sort: event.target.value as SortId })}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </Block>

      {/* Active filters */}
      {chips.length ? (
        <div className="flex flex-wrap items-center gap-2 px-1 pt-2" aria-label="Active filters">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="y-filter !min-h-10 !ps-4 !pe-3"
              aria-label={`Remove filter: ${chip.label}`}
              onClick={() => commit(chip.remove(filters))}
            >
              <span>
                {chip.label}
                {chip.native ? (
                  <span dir="rtl" lang="ar" className="ms-1.5 font-normal opacity-75">
                    {chip.native}
                  </span>
                ) : null}
              </span>
              <X size={16} aria-hidden />
            </button>
          ))}
          <button type="button" className="y-link y-small ms-1 px-2 py-2 font-semibold" onClick={clearAll}>
            Clear all
          </button>
        </div>
      ) : null}

      {/* Results */}
      <section aria-labelledby="results-heading" className="flex flex-col gap-2 pt-4">
        <h2
          id="results-heading"
          ref={resultsRef}
          tabIndex={-1}
          className="y-head scroll-mt-24 px-1 pb-1 outline-none"
          aria-live="polite"
        >
          {loading
            ? "Finding creators…"
            : results.length
              ? `${plural(results.length, "creator")}${chips.length ? (results.length === 1 ? " matches" : " match") : ""}`
              : "No matches yet"}
        </h2>

        {loading ? (
          <CreatorGridSkeleton count={Math.min(8, Math.max(results.length, 4))} />
        ) : results.length === 0 ? (
          <Block tone="paper" pad="md">
            <EmptyState
              title="No creators match all of that"
              body={
                signedIn
                  ? "Try removing a filter or two. Or post an order and let creators who fit come to you."
                  : "Try removing a filter or two, or search for a niche like “fintech” or “skit”."
              }
              shape="bean"
              tint="violet"
              face="calm"
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <PillButton variant="contrast" onClick={clearAll}>
                    Clear filters
                  </PillButton>
                  <PillButton variant="outline" href={paths.newOrder()}>
                    Post an order instead
                  </PillButton>
                </div>
              }
            />
          </Block>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} className="y-enter" />
            ))}
          </div>
        )}
      </section>

      <FilterSheet
        s={s}
        open={sheetOpen}
        draft={draft}
        onDraft={setDraft}
        onClose={() => setSheetOpen(false)}
        onApply={() => {
          commit({ ...draft, q: filters.q, format: filters.format, sort: filters.sort });
          setSheetOpen(false);
        }}
      />
    </div>
  );
}
