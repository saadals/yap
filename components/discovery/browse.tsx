"use client";

import { BadgeCheck, Eye, Search, ShieldCheck, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useMemo, useRef, useState } from "react";

import { CreatorCard } from "@/components/domain/creator-card";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { AvatarStack } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { useSimulatedLoading } from "@/lib/hooks";
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

/** Insert the "post a request" nudge after this many cards (businesses only). */
const NUDGE_AFTER = 8;

export function Browse() {
  const s = useDemo();
  const { role } = usePrefs();
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
    router.replace(query ? `/creators?${query}` : "/creators", { scroll: false });
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
  const isBusiness = role === "business";

  const clearAll = () => commit({ ...emptyFilters, sort: filters.sort });

  return (
    <div className="flex flex-col gap-2">
      {/* Hero search */}
      <Block tone="paper" pad="lg" className="flex flex-col gap-6">
        <div className="flex max-w-3xl flex-col gap-3">
          <p className="y-small y-fg-2 flex flex-wrap items-center gap-2.5">
            <AvatarStack
              people={s.creators.slice(0, 5).map((c) => ({ id: c.id, name: "" }))}
              size={28}
              max={5}
            />
            {plural(s.creators.length, "creator")} in {cityCount} cities, from everyday presenters to
            studio producers
          </p>
          <h1 className="y-display y-t-display">
            Find a creator who <span className="y-strong">speaks your customer&apos;s language</span>
          </h1>
          <p className="y-lead y-fg-2 max-w-[62ch]">
            Watch real work, compare clear packages and commission directly. Every brief keeps your
            product context, so the next video is even easier.
          </p>
        </div>
        <form
          role="search"
          aria-label="Search creators"
          className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            commit(filters);
            resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            resultsRef.current?.focus({ preventScroll: true });
          }}
        >
          <label className="flex flex-col gap-2">
            <span className="y-label">Search</span>
            <span className="relative block">
              <Search
                size={20}
                aria-hidden
                className="y-fg-2 pointer-events-none absolute start-5 top-1/2 -translate-y-1/2"
              />
              <input
                type="search"
                className="y-input ps-13"
                placeholder="Name, @handle, niche or style"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                onBlur={() => {
                  if (q.trim() !== urlFilters.q) commit(filters);
                }}
              />
            </span>
          </label>
          <label className="flex flex-col gap-2">
            <span className="y-label">Dialect</span>
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
          <PillButton type="submit" variant="neon" size="lg" arrow className="md:min-w-40">
            Search
          </PillButton>
        </form>
      </Block>

      {/* Trust strip */}
      <Block tone="sky" pad="sm" className="!py-3">
        <ul className="flex flex-col gap-2 px-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
          <li className="y-small flex items-center gap-2 font-medium">
            <BadgeCheck size={18} aria-hidden className="flex-none" /> Every creator is ID-verified
            before they get paid
          </li>
          <li className="y-small flex items-center gap-2 font-medium">
            <ShieldCheck size={18} aria-hidden className="flex-none" /> Payment protected until you
            approve
          </li>
          <li className="y-small flex items-center gap-2 font-medium">
            <Eye size={18} aria-hidden className="flex-none" /> Free to browse, no account needed
          </li>
        </ul>
      </Block>

      {/* Category bar + filters + sort */}
      <Block tone="paper" pad="none" className="flex flex-col lg:flex-row lg:items-center">
        <CategoryBar
          className="min-w-0 flex-1 px-2 pt-1"
          value={filters.format}
          onChange={(format: FormatId | null) => commit({ ...filters, format })}
        />
        <div className="flex flex-wrap items-center gap-2 border-t border-(--b-line) px-4 py-3 lg:flex-none lg:border-t-0 lg:border-s lg:py-4">
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
        <div className="flex items-baseline justify-between gap-3 px-1 pb-1">
          <h2
            id="results-heading"
            ref={resultsRef}
            tabIndex={-1}
            className="y-head scroll-mt-24 outline-none"
            aria-live="polite"
          >
            {loading
              ? "Finding creators…"
              : results.length
                ? `${plural(results.length, "creator")}${
                    chips.length ? (results.length === 1 ? " matches" : " match") : " ready to work with you"
                  }`
                : "No matches yet"}
          </h2>
          {!loading && results.length && filters.sort === "recommended" ? (
            <p className="y-micro y-fg-2 hidden sm:block">
              Available first, then rating, repeat clients and on-time delivery
            </p>
          ) : null}
        </div>

        {loading ? (
          <CreatorGridSkeleton count={Math.min(8, Math.max(results.length, 4))} />
        ) : results.length === 0 ? (
          <Block tone="paper" pad="md">
            <EmptyState
              title="No creators match all of that"
              body={
                isBusiness
                  ? "Try removing a filter or two. Or post a request and let creators who fit come to you with pitches."
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
                  <PillButton variant="outline" href="/business/requests/new">
                    Post a request instead
                  </PillButton>
                </div>
              }
            />
          </Block>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((creator, index) => (
              <Fragment key={creator.id}>
                <CreatorCard creator={creator} className="y-enter" />
                {isBusiness && index === NUDGE_AFTER - 1 && results.length > NUDGE_AFTER ? (
                  <RequestNudge />
                ) : null}
              </Fragment>
            ))}
            {isBusiness && results.length <= NUDGE_AFTER && results.length >= 3 ? <RequestNudge /> : null}
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

/** Lavender (fit/matching): let creators come to you instead. */
function RequestNudge() {
  return (
    <Block tone="lavender" pad="md" className="flex flex-col justify-between gap-6">
      <div className="flex flex-col gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-(--b-fg) text-(--b-bg)">
          <Sparkles size={22} aria-hidden />
        </span>
        <h3 className="y-display y-title">Not sure who to pick?</h3>
        <p className="y-body y-fg-2">
          Post a request and let creators pitch. You&apos;ll see their angle, price and relevant work
          side by side, usually within a day.
        </p>
      </div>
      <PillButton variant="contrast" href="/business/requests/new" arrow className="w-fit">
        Post a request
      </PillButton>
    </Block>
  );
}
