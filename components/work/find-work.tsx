"use client";

import { ArrowLeft, ArrowRight, LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";

import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { SelectPill } from "@/components/ui/select-pill";
import { num } from "@/lib/format";
import { findWork, me, type WorkItem, type WorkResult } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { formats, jobTypeById, niches, nicheById, platformById } from "@/lib/taxonomy";

import { type FindState, hasFilters, sortOptions, toWorkQuery } from "./find-query";
import { JobCard, JobRow } from "./job-card";

const typeHelp: Record<FindState["kind"], React.ReactNode> = {
  all: (
    <>
      <b>Two ways to get work.</b> UGC campaigns: many creators, fixed price per Yapp, pick a slot. Custom
      orders: one creator, made to the brief, pitch for it.
    </>
  ),
  campaign: (
    <>
      <b>UGC campaigns</b> · a brand needs many Yapps. Fixed price per video. Pick a slot and start today, no
      pitching.
    </>
  ),
  custom: (
    <>
      <b>Custom orders</b> · a brand needs one made-to-brief video or piece of ad copy. Send your idea and
      price. The brand picks one creator.
    </>
  ),
};

const scrollToId = (id: string) =>
  window.requestAnimationFrame(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  });

/** How many filters are on, for the Filters button below 1180px. */
const filterCount = (state: FindState) =>
  state.categories.length +
  state.jobTypes.length +
  (state.platform !== "any" ? 1 : 0) +
  (state.minPay ? 1 : 0) +
  (state.within ? 1 : 0);

/**
 * Find work (Work spec 6.5): the finder bar (search, the category select, the dark Search pill),
 * the format tabs with counts, the cards or list toggle and sort; the type bar with its help; the
 * active filters as removable chips; then the results. All + cards shows two panels ("Pick a Yapp
 * now", "Pitch for it") with the top six of each; one type shows twelve per page; the list view is
 * one table. Everything comes from `findWork()`; the page keeps the filters in the URL.
 */
export function FindWork({
  state,
  text,
  onText,
  onSearch,
  update,
  clear,
  onOpenFilters,
  onOpen,
}: {
  /** The filters, with the search as typed. */
  state: FindState;
  text: string;
  onText: (value: string) => void;
  onSearch: () => void;
  update: (patch: Partial<FindState>) => void;
  clear: () => void;
  onOpenFilters: () => void;
  /** A job is being opened (remember Find work for its back pill). */
  onOpen: () => void;
}) {
  const s = useDemo();
  const result = findWork(s, toWorkQuery(state));
  const { facets } = result;
  const mix = state.kind === "all" && state.view === "cards";
  const campaigns = mix ? findWork(s, toWorkQuery(state, { kind: "campaign", page: 1, pageSize: 6 })) : null;
  const customs = mix ? findWork(s, toWorkQuery(state, { kind: "custom", page: 1, pageSize: 6 })) : null;
  const noProfile = !me.creator(s);
  const active = filterCount(state);

  const goPage = (page: number) => {
    update({ page });
    scrollToId("find-work");
  };

  /* ---------------------------------------------------------- active chips */
  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (state.format !== "all")
    chips.push({ key: "fmt", label: formats.find((f) => f.id === state.format)?.name ?? "", remove: () => update({ format: "all" }) });
  for (const j of state.jobTypes)
    chips.push({ key: `job-${j}`, label: jobTypeById[j].name, remove: () => update({ jobTypes: state.jobTypes.filter((x) => x !== j) }) });
  for (const c of state.categories)
    chips.push({ key: `cat-${c}`, label: nicheById[c].name, remove: () => update({ categories: state.categories.filter((x) => x !== c) }) });
  if (state.platform !== "any")
    chips.push({ key: "plat", label: platformById[state.platform].name, remove: () => update({ platform: "any" }) });
  if (state.minPay) chips.push({ key: "pay", label: `$${state.minPay}+`, remove: () => update({ minPay: 0 }) });
  if (state.within)
    chips.push({
      key: "within",
      label: state.within === 7 ? "Closes within a week" : `Closes in ${state.within} days`,
      remove: () => update({ within: 0 }),
    });
  if (state.q.trim()) chips.push({ key: "q", label: `“${state.q.trim()}”`, remove: () => update({ q: "" }) });

  const first = (result.page - 1) * result.pageSize + 1;
  const last = first + result.items.length - 1;
  const total = mix ? (campaigns?.total ?? 0) + (customs?.total ?? 0) : result.total;

  return (
    <section id="find-work" aria-label="Find work" className="y-findwork">
      {/* --------------------------------------------------------- finder bar */}
      <Block tone="paper" pad="none" className="y-finder" role="search">
        <form
          className="y-frow"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
            scrollToId("find-results");
          }}
        >
          <label className="y-fq">
            <Search size={20} strokeWidth={1.9} aria-hidden className="flex-none" />
            <input
              type="search"
              value={text}
              onChange={(event) => onText(event.target.value)}
              placeholder="Brand, product or keyword"
              aria-label="Search open work"
              enterKeyHint="search"
            />
          </label>
          <SelectPill
            label="Category"
            size="lg"
            className="y-fcat"
            value={state.categories.length === 1 ? state.categories[0] : state.categories.length ? "__many" : ""}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "__many") return;
              update({ categories: value ? [value as FindState["categories"][number]] : [] });
            }}
            options={[
              { value: "", label: "Any category" },
              ...(state.categories.length > 1
                ? [{ value: "__many", label: `${state.categories.length} categories` }]
                : []),
              ...niches.map((n) => ({ value: n.id, label: n.name })),
            ]}
          />
          <button type="submit" className="y-fgo">
            Search
            <span className="y-fgo-ar" aria-hidden>
              <ArrowRight size={20} strokeWidth={2.2} className="y-flip" />
            </span>
          </button>
        </form>
        <div className="y-frow2">
          <div className="y-fmts" role="tablist" aria-label="Format">
            {[{ id: "all" as const, name: "All formats", icon: LayoutGrid }, ...formats].map((f) => {
              const Icon = f.icon;
              const selected = state.format === f.id;
              const count = f.id === "all" ? undefined : (facets.formats[f.id] ?? 0);
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className="y-fmt"
                  data-zero={count === 0 ? "true" : undefined}
                  onClick={() => update({ format: f.id })}
                >
                  <Icon size={24} strokeWidth={1.7} aria-hidden />
                  <span>{f.name}</span>
                  {count !== undefined ? (
                    <b className="y-fmt-n y-num" aria-label={`${count} open`}>
                      {count}
                    </b>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="y-ftools">
            <button type="button" className="y-ffilters" onClick={onOpenFilters} aria-haspopup="dialog">
              <SlidersHorizontal size={18} strokeWidth={1.9} aria-hidden />
              Filters
              {active ? <span className="y-ffilters-n y-num">{active}</span> : null}
            </button>
            <div className="y-vt" role="group" aria-label="View" data-list={state.view === "list" ? "true" : "false"}>
              <button
                type="button"
                aria-pressed={state.view === "cards"}
                aria-label="Cards"
                title="Cards"
                onClick={() => update({ view: "cards" })}
              >
                <LayoutGrid size={18} strokeWidth={1.9} aria-hidden />
              </button>
              <button
                type="button"
                aria-pressed={state.view === "list"}
                aria-label="List"
                title="List"
                onClick={() => update({ view: "list" })}
              >
                <List size={18} strokeWidth={1.9} aria-hidden />
              </button>
            </div>
            <span className="y-ftools-l" aria-hidden>
              Sort
            </span>
            <SelectPill
              label="Sort"
              size="md"
              className="y-fsort"
              value={state.sort}
              onChange={(event) => update({ sort: event.target.value as FindState["sort"], page: state.page })}
              options={sortOptions}
            />
          </div>
        </div>
      </Block>

      {/* ----------------------------------------------------------- type bar */}
      <div id="find-types" className="y-typebar">
        <SegmentedToggle
          label="Type"
          size="lg"
          fill
          phoneCounts={false}
          className="y-kinds"
          value={state.kind}
          onChange={(kind) => update({ kind })}
          options={[
            { value: "all", label: "All", count: facets.kind.campaign + facets.kind.custom },
            { value: "campaign", label: "UGC campaigns", count: facets.kind.campaign },
            { value: "custom", label: "Custom orders", count: facets.kind.custom },
          ]}
        />
        <p className="y-typehelp">{typeHelp[state.kind]}</p>
      </div>

      {noProfile ? (
        <p className="y-fw-note">
          You&apos;re browsing as a brand. <b>Create a creator profile to take work</b>: the button on any job sets it
          up in a minute, on this same account.
        </p>
      ) : null}

      {/* ------------------------------------------------------- results head */}
      <div id="find-results" className="y-resh">
        <p className="y-num" aria-live="polite">
          {!total ? (
            "No results"
          ) : mix ? (
            <>
              <b>{num(total)}</b> open · top picks of each type
            </>
          ) : (
            <>
              Showing{" "}
              <b>
                {first}–{last}
              </b>{" "}
              of <b>{num(result.total)}</b>
            </>
          )}
        </p>
        {chips.length ? (
          <div className="y-actchips">
            {chips.map((chip) => (
              <button key={chip.key} type="button" className="y-ac" onClick={chip.remove} aria-label={`Remove ${chip.label}`}>
                {chip.label}
                <span aria-hidden>
                  <X size={12} strokeWidth={2.5} />
                </span>
              </button>
            ))}
            <button type="button" className="y-link-btn y-hit" onClick={clear}>
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      {/* ------------------------------------------------------------ results */}
      {!total ? (
        <Block tone="paper" pad="md">
          <EmptyState
            title="No open work matches"
            body={hasFilters(state) ? "Remove a filter, or clear them all to see everything that's open." : "Nothing is open right now. New jobs appear here as brands post them."}
            icon={<Search size={22} aria-hidden />}
            action={
              hasFilters(state) || state.kind !== "all" ? (
                <PillButton variant="soft" onClick={clear}>
                  Clear all filters
                </PillButton>
              ) : undefined
            }
          />
        </Block>
      ) : state.view === "list" ? (
        <>
          <Block tone="paper" pad="none" className="y-olist" role="table" aria-label="Open work">
            <div className="y-lrow y-lrow-hd" role="row">
              <span role="columnheader">Opportunity</span>
              <span role="columnheader" className="y-lrow-type">
                Type
              </span>
              <span role="columnheader" className="y-lrow-fmt">
                Format
              </span>
              <span role="columnheader">Pay</span>
              <span role="columnheader" className="y-lrow-open">
                Open
              </span>
              <span role="columnheader">
                <span className="sr-only">Action</span>
              </span>
            </div>
            {result.items.map((item) => (
              <JobRow key={item.id} item={item} onOpen={onOpen} />
            ))}
          </Block>
          <Pager result={result} onPage={goPage} />
        </>
      ) : mix ? (
        <div className="y-panels">
          {campaigns?.total ? (
            <Panel
              look="camp"
              eyebrow="UGC campaigns · quantity"
              title="Pick a Yapp now"
              text="Many creators, one brief. Fixed price per video. Grab a slot, no pitching."
              figure={campaigns.openSlots}
              figureLabel={campaigns.openSlots === 1 ? "Yapp open" : "Yapps open"}
              items={campaigns.items}
              onOpen={onOpen}
              more={
                campaigns.total > campaigns.items.length
                  ? {
                      label: `See all ${campaigns.total} UGC campaigns`,
                      onClick: () => {
                        update({ kind: "campaign" });
                        scrollToId("find-types");
                      },
                    }
                  : undefined
              }
            />
          ) : null}
          {customs?.total ? (
            <Panel
              look="ord"
              eyebrow="Custom orders · one creator"
              title="Pitch for it"
              text="One made-to-brief video or piece of ad copy. Send your idea and price. The brand picks who makes it."
              figure={customs.total}
              figureLabel={customs.total === 1 ? "order open" : "orders open"}
              items={customs.items}
              onOpen={onOpen}
              more={
                customs.total > customs.items.length
                  ? {
                      label: `See all ${customs.total} custom orders`,
                      onClick: () => {
                        update({ kind: "custom" });
                        scrollToId("find-types");
                      },
                    }
                  : undefined
              }
            />
          ) : null}
        </div>
      ) : (
        <>
          <Panel
            look={state.kind === "campaign" ? "camp" : "ord"}
            eyebrow={state.kind === "campaign" ? "UGC campaigns · quantity" : "Custom orders · one creator"}
            title={state.kind === "campaign" ? "Pick a Yapp now" : "Pitch for it"}
            text={
              state.kind === "campaign"
                ? "Many creators, one brief. Fixed price per video. Grab a slot, no pitching."
                : "One made-to-brief video or piece of ad copy. Send your idea and price. The brand picks who makes it."
            }
            figure={state.kind === "campaign" ? result.openSlots : result.total}
            figureLabel={
              state.kind === "campaign"
                ? result.openSlots === 1
                  ? "Yapp open"
                  : "Yapps open"
                : result.total === 1
                  ? "order open"
                  : "orders open"
            }
            items={result.items}
            onOpen={onOpen}
          />
          <Pager result={result} onPage={goPage} />
        </>
      )}
    </section>
  );
}

function Panel({
  look,
  eyebrow,
  title,
  text,
  figure,
  figureLabel,
  items,
  more,
  onOpen,
}: {
  look: "camp" | "ord";
  eyebrow: string;
  title: string;
  text: string;
  figure: number;
  figureLabel: string;
  items: WorkItem[];
  more?: { label: string; onClick: () => void };
  onOpen: () => void;
}) {
  const id = `panel-${look}`;
  return (
    <section className="y-tpanel" data-look={look} aria-labelledby={id}>
      <div className="y-tp-h">
        <div className="min-w-0">
          <span className="y-tp-k">{eyebrow}</span>
          <h3 id={id} className="y-display y-tp-t">
            {title}
          </h3>
          <p className="y-tp-p">{text}</p>
        </div>
        <span className="y-tp-n y-num">
          {num(figure)}
          <small>{figureLabel}</small>
        </span>
      </div>
      <ul className="y-tp-grid">
        {items.map((item) => (
          <li key={item.id} className="flex min-w-0">
            <JobCard item={item} onOpen={onOpen} />
          </li>
        ))}
      </ul>
      {more ? (
        <PillButton
          variant="soft"
          size="sm"
          className="y-seeall"
          onClick={more.onClick}
          icon={<ArrowRight size={16} aria-hidden className="y-flip order-last" />}
        >
          {more.label}
        </PillButton>
      ) : null}
    </section>
  );
}

function Pager({ result, onPage }: { result: WorkResult; onPage: (page: number) => void }) {
  if (result.pageCount <= 1) return null;
  return (
    <nav className="y-pager" aria-label="Pages">
      <button type="button" disabled={result.page === 1} onClick={() => onPage(result.page - 1)}>
        <ArrowLeft size={16} aria-hidden className="y-flip" /> Prev
      </button>
      {Array.from({ length: result.pageCount }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          type="button"
          aria-current={page === result.page ? "page" : undefined}
          aria-label={`Page ${page}`}
          onClick={() => onPage(page)}
        >
          {page}
        </button>
      ))}
      <button type="button" disabled={result.page === result.pageCount} onClick={() => onPage(result.page + 1)}>
        Next <ArrowRight size={16} aria-hidden className="y-flip" />
      </button>
    </nav>
  );
}

