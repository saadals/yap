"use client";

import { LayoutGrid, Play, Repeat2, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useRef, useState } from "react";

import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { List, Row } from "@/components/ui/list";
import { Page, PageHeader, SectionLabel } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { plural, shortDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { me, pastCollaborators, savedCreatorIds } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";
import { formats } from "@/lib/taxonomy";
import type { FormatId, Product } from "@/lib/types";

import "@/app/styles/discover.css";

import { BrowseShell } from "./browse-shell";
import { CreatorTile, CreatorTileSkeleton, tileGrid } from "./creator-tile";
import { FilterSheet } from "./filter-sheet";
import {
  type Filters,
  activeChips,
  discoverHref,
  emptyFilters,
  filterCreators,
  parseFilters,
  productFit,
  savedCreators,
  sheetFilterCount,
  sortOptions,
} from "./filters";

/** /discover: find creators (All) and the ones you saved (Saved). Public; richer signed in. */
export function DiscoverPage() {
  return (
    <BrowseShell>
      <Page width="full">
        <Suspense fallback={<DiscoverSkeleton />}>
          <Discover />
        </Suspense>
      </Page>
    </BrowseShell>
  );
}

function Discover() {
  const s = useDemo();
  const hydrated = useHydrated();
  const { account } = usePrefs();
  const router = useRouter();
  const params = useSearchParams();
  const urlFilters = useMemo(() => parseFilters(params), [params]);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const signedIn = Boolean(account);

  // Search text filters live but only reaches the URL on submit or blur (or with any other filter
  // change), so typing never races the router. It follows the URL when that changes elsewhere.
  const [q, setQ] = useState(urlFilters.q);
  const [seenQ, setSeenQ] = useState(urlFilters.q);
  if (urlFilters.q !== seenQ) {
    setSeenQ(urlFilters.q);
    setQ(urlFilters.q);
  }
  const filters: Filters = useMemo(() => ({ ...urlFilters, q }), [urlFilters, q]);

  const commit = (next: Filters) => {
    setQ(next.q);
    router.replace(discoverHref(next), { scroll: false });
  };

  // "Best for {product}": the account's products, the one ordered for most first.
  const orderCount = (id: string) =>
    s.commissions.filter((c) => c.brief.productId === id).length + s.requests.filter((r) => r.brief.productId === id).length;
  const products: Product[] = signedIn
    ? s.products
        .filter((p) => p.businessId === me.ids(s).businessId)
        .sort((a, b) => orderCount(b.id) - orderCount(a.id) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    : [];
  const fitProduct =
    filters.sort === "fit" ? (products.find((p) => p.id === filters.product) ?? products[0]) : undefined;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(filters);

  if (!hydrated) return <DiscoverSkeleton />;

  const saved = signedIn ? savedCreators(s, savedCreatorIds(s)) : [];
  const tab = signedIn ? filters.tab : "all";

  return (
    <div className="flex flex-col">
      {/* The Watch button stays beside the title on phones too, so creators show sooner. */}
      <div className="flex items-start justify-between gap-3 md:items-end">
        <PageHeader
          className="!pb-4 min-w-0 flex-1"
          title="Find creators"
          description="Watch their work, then order. Payment is held until you approve."
        />
        <PillButton
          href={paths.watch()}
          variant="contrast"
          className="mt-0.5 flex-none md:mb-5"
          icon={<Play size={16} aria-hidden className="fill-current" />}
        >
          Watch<span className="max-md:hidden"> videos</span>
        </PillButton>
      </div>

      {signedIn ? (
        <Tabs
          label="Creators"
          value={tab}
          className="mb-4"
          items={[
            { id: "all", label: "All creators", href: discoverHref({ ...filters, tab: "all" }) },
            { id: "saved", label: "Saved", count: saved.length, href: discoverHref({ ...filters, tab: "saved" }) },
          ]}
        />
      ) : null}

      {tab === "saved" ? (
        <SavedTab saved={saved} onBrowse={() => commit({ ...filters, tab: "all" })} />
      ) : (
        <AllTab
          filters={filters}
          committedQ={urlFilters.q}
          q={q}
          setQ={setQ}
          commit={commit}
          products={products}
          fitProduct={fitProduct}
          resultsRef={resultsRef}
          openSheet={() => {
            setDraft(filters);
            setSheetOpen(true);
          }}
        />
      )}

      <FilterSheet
        s={s}
        open={sheetOpen}
        draft={draft}
        onDraft={setDraft}
        onClose={() => setSheetOpen(false)}
        onApply={() => {
          commit({ ...draft, q: filters.q, format: filters.format, sort: filters.sort, product: filters.product, tab: "all" });
          setSheetOpen(false);
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* All creators                                                                */
/* -------------------------------------------------------------------------- */

function AllTab({
  filters,
  committedQ,
  q,
  setQ,
  commit,
  products,
  fitProduct,
  resultsRef,
  openSheet,
}: {
  filters: Filters;
  /** The search text currently in the URL. */
  committedQ: string;
  q: string;
  setQ: (q: string) => void;
  commit: (next: Filters) => void;
  products: Product[];
  fitProduct?: Product;
  resultsRef: React.RefObject<HTMLHeadingElement | null>;
  openSheet: () => void;
}) {
  const s = useDemo();
  const results = filterCreators(s, filters, fitProduct);
  const chips = activeChips(filters);
  const sheetCount = sheetFilterCount(filters);
  const filtered = chips.length > 0 || filters.format !== null;
  const clearAll = () => commit({ ...emptyFilters, sort: filters.sort, product: filters.product });
  const bestFor = products.find((p) => p.id === filters.product) ?? products[0];
  const sortValue = filters.sort === "fit" && fitProduct ? `fit:${fitProduct.id}` : filters.sort === "fit" ? "recommended" : filters.sort;

  return (
    <>
      {/* Search, then Filters, Best for and Sort */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <form
            role="search"
            aria-label="Search creators"
            className="min-w-0 md:max-w-[560px] md:flex-1"
            onSubmit={(event) => {
              event.preventDefault();
              commit(filters);
              resultsRef.current?.focus({ preventScroll: true });
            }}
          >
            <label className="relative block">
              <span className="sr-only">Search creators</span>
              <Search size={18} aria-hidden className="y-fg-2 pointer-events-none absolute start-4 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                className="y-input ps-11"
                placeholder="Name, @handle, language or category"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                onBlur={() => {
                  if (q.trim() !== committedQ.trim()) commit(filters);
                }}
                enterKeyHint="search"
              />
            </label>
          </form>
          <div className="y-scroll-x -mx-(--y-gutter) flex items-center gap-2 px-(--y-gutter) md:mx-0 md:px-0">
            <button
              type="button"
              className="y-filter y-dsc-chip flex-none"
              aria-pressed={sheetCount > 0}
              aria-haspopup="dialog"
              onClick={openSheet}
            >
              <SlidersHorizontal size={16} aria-hidden />
              <span>Filters</span>
              {sheetCount ? (
                <span className="y-count">
                  {sheetCount}
                  <span className="sr-only"> active</span>
                </span>
              ) : null}
            </button>
            {bestFor ? (
              <button
                type="button"
                className="y-filter y-dsc-chip flex-none max-md:order-last"
                aria-pressed={filters.sort === "fit"}
                title={`Rank creators by how well they fit ${bestFor.name}`}
                onClick={() =>
                  commit(
                    filters.sort === "fit"
                      ? { ...filters, sort: "recommended", product: null }
                      : { ...filters, sort: "fit", product: bestFor.id },
                  )
                }
              >
                <Sparkles size={16} aria-hidden />
                <span>Best for {bestFor.name}</span>
              </button>
            ) : null}
            <label className="flex flex-none items-center gap-2 md:ms-2">
              <span className="y-small y-fg-2 font-medium max-md:sr-only">Sort</span>
              <select
                className="y-input y-dsc-select"
                value={sortValue}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value.startsWith("fit:")) commit({ ...filters, sort: "fit", product: value.slice(4) });
                  else commit({ ...filters, sort: value as Filters["sort"], product: null });
                }}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                {products.map((product) => (
                  <option key={product.id} value={`fit:${product.id}`}>
                    Best for {product.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <FormatRow value={filters.format} onChange={(format) => commit({ ...filters, format })} />

        {chips.length ? (
          <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className="y-filter y-dsc-chip !ps-3.5 !pe-2.5"
                aria-label={`Remove filter: ${chip.label}`}
                onClick={() => commit(chip.remove(filters))}
              >
                <span>{chip.label}</span>
                <X size={15} aria-hidden />
              </button>
            ))}
            <button type="button" className="y-link y-small ms-1 px-2 py-2 font-medium" onClick={clearAll}>
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      <section aria-labelledby="results-heading" className="flex flex-col gap-3 pt-5">
        <h2
          id="results-heading"
          ref={resultsRef}
          tabIndex={-1}
          className="y-small y-fg-2 scroll-mt-24 font-medium outline-none"
          aria-live="polite"
        >
          {results.length
            ? `${plural(results.length, "creator")}${filtered ? (results.length === 1 ? " matches" : " match") : ""}${
                fitProduct ? ` · best fit for ${fitProduct.name} first` : ""
              }`
            : "No matches"}
        </h2>

        {results.length === 0 ? (
          <Block tone="paper" pad="md">
            <EmptyState
              title="No creators match all of that"
              body="Try removing a filter or two. Or post a custom order and let creators who fit pitch to you."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <PillButton variant="contrast" onClick={clearAll}>
                    Clear filters
                  </PillButton>
                  <PillButton variant="outline" href={paths.newOrder({ type: "custom" })}>
                    Post a custom order
                  </PillButton>
                </div>
              }
            />
          </Block>
        ) : (
          <div className={tileGrid}>
            {results.map((creator) => (
              <CreatorTile
                key={creator.id}
                creator={creator}
                reason={fitProduct ? reasonLine(productFit(s, creator, fitProduct).reasons) : undefined}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/** The tile's "why it fits" line: the strongest reason, and the next one only when both fit on a tile. */
function reasonLine(reasons: string[]): string | undefined {
  const [first, second] = reasons;
  if (!first) return undefined;
  return second && first.length + second.length <= 34 ? `${first} · ${second}` : first;
}

/** All + every format, one horizontally scrolling row of chips. */
function FormatRow({ value, onChange }: { value: FormatId | null; onChange: (format: FormatId | null) => void }) {
  const items = [
    { id: null, name: "All formats", icon: LayoutGrid },
    ...formats.map((f) => ({ id: f.id, name: f.name, icon: f.icon })),
  ];
  return (
    <div
      role="group"
      aria-label="Format"
      className="y-scroll-x -mx-(--y-gutter) flex gap-2 px-(--y-gutter) pb-0.5"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id ?? "all"}
            type="button"
            className="y-filter y-dsc-chip flex-none"
            aria-pressed={value === item.id}
            onClick={() => onChange(value === item.id ? null : item.id)}
          >
            <Icon size={16} aria-hidden />
            <span>{item.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Saved                                                                       */
/* -------------------------------------------------------------------------- */

function SavedTab({ saved, onBrowse }: { saved: ReturnType<typeof savedCreators>; onBrowse: () => void }) {
  const s = useDemo();
  const worked = pastCollaborators(s);

  return (
    <div className="flex flex-col">
      {saved.length ? (
        <div className={tileGrid}>
          {saved.map((creator) => (
            <CreatorTile key={creator.id} creator={creator} />
          ))}
        </div>
      ) : (
        <Block tone="paper" pad="md">
          <EmptyState
            title="No saved creators yet"
            body="Tap the heart on any creator to keep them here while you decide."
            action={
              <PillButton variant="contrast" onClick={onBrowse}>
                Browse creators
              </PillButton>
            }
          />
        </Block>
      )}

      {worked.length ? (
        <section aria-labelledby="worked-heading">
          <SectionLabel id="worked-heading">Worked with before</SectionLabel>
          <List label="Creators you've worked with">
            {worked.map(({ creator, count, last }) => (
              <Row
                key={creator.id}
                lead={<FaceAvatar id={creator.id} name="" size={40} />}
                title={
                  <Link href={paths.creator(creator.handle)} className="hover:underline">
                    {creator.name}
                  </Link>
                }
                meta={`${plural(count, "job")} together · last delivered ${shortDate(last.completedAt ?? last.createdAt)}`}
                end={
                  <PillButton
                    href={paths.orderCreator(creator.handle, { again: last.id })}
                    variant="outline"
                    size="sm"
                    icon={<Repeat2 size={15} aria-hidden />}
                  >
                    Order again
                  </PillButton>
                }
              />
            ))}
          </List>
        </section>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Skeleton                                                                    */
/* -------------------------------------------------------------------------- */

export function DiscoverSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading creators">
      <div className="flex flex-col gap-2 pb-2" aria-hidden>
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-11 w-full max-w-[560px] !rounded-(--y-r-field)" />
      <div className="flex gap-2 overflow-hidden" aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-32 flex-none !rounded-full" />
        ))}
      </div>
      <div className={`${tileGrid} pt-6`}>
        {Array.from({ length: 10 }, (_, i) => (
          <CreatorTileSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
