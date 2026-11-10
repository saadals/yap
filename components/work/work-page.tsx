"use client";

import { BarChart3, Clapperboard, Search, ShieldCheck, ShoppingBag, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Sheet, SheetActions } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { PillButton } from "@/components/ui/pill-button";
import { WidePage } from "@/components/ui/page";
import { moneyExact, money, num } from "@/lib/format";
import { type WorkTab, paths } from "@/lib/paths";
import {
  businessSpend,
  commissionsForBusiness,
  commissionsForCreator,
  creatorEarnings,
  findWork,
  isActive,
  me,
} from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

import { FindFilters } from "./find-filters";
import { type FindState, clearedFind, findHref, parseFind, rememberFindWork, toWorkQuery } from "./find-query";
import { FindWork } from "./find-work";
import { needsYou } from "./needs-you";
import { NeedsYouBlock } from "./needs-you-block";
import { MakingView, OrderedView } from "./sections";
import { TakeWorkProvider } from "./take-work";

const isTab = (value: string | null): value is WorkTab =>
  value === "find" || value === "ordered" || value === "making";

const help: Record<WorkTab, React.ReactNode> = {
  find: (
    <>
      <b>Find work</b> · every open UGC campaign and custom order, in one place. Pick a Yapp now, or pitch for a
      custom order.
    </>
  ),
  ordered: (
    <>
      <b>Ordered</b> · videos you asked creators to make. Review, approve and pay here.
    </>
  ),
  making: (
    <>
      <b>Making</b> · videos you are making for brands. Deliver, reply to comments and get paid here.
    </>
  ),
};

/** The search as typed, and what the URL said when typing started (see `live` below). */
type Typed = { text: string; base: string; pending: string | null };

/**
 * Put Find work's filters in the address bar without a server round trip: Next.js syncs
 * `useSearchParams()` with the native history API. A relative "?…" keeps the path as served
 * (base path and trailing slash included on GitHub Pages).
 */
function replaceQuery(href: string) {
  window.history.replaceState(null, "", href.slice(href.indexOf("?")));
}

/**
 * Work (Work spec 6.3–6.5): one page for everything in flight on both sides of a deal, and every
 * open job. Above 1180px a sidebar holds Find work, Ordered, Making and a link to Productivity,
 * with Find work's filters under it; below, a segmented control and a Filters sheet. "Needs you"
 * comes first on every section. Which section opens follows the account (Find work with a creator
 * profile, Ordered without; answers item 30); `?tab=` and every Find work filter live in the URL.
 * Uses `useSearchParams`: render inside <Suspense>.
 */
export function WorkPage() {
  const s = useDemo();
  const hydrated = useHydrated();
  const params = useSearchParams();
  const router = useRouter();
  const url = parseFind(params);
  const [typed, setTyped] = useState<Typed>({ text: url.q, base: url.q, pending: null });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!hydrated) return <WorkSkeleton />;

  const param = params.get("tab");
  const tab: WorkTab = isTab(param) ? param : me.creator(s) ? "find" : "ordered";
  const step = needsYou(s);

  // The search box filters as you type and reaches the URL a moment later. If the URL's search
  // changed some other way (a removed chip, Clear all, a link), the URL wins.
  const live = url.q === typed.base || url.q === typed.pending;
  const text = live ? typed.text : url.q;
  const state: FindState = { ...url, q: text, page: text === url.q ? url.page : 1 };

  const go = (next: FindState) => {
    window.clearTimeout(timer.current);
    setTyped({ text: next.q, base: url.q, pending: next.q });
    replaceQuery(findHref(next));
  };
  const update = (patch: Partial<FindState>) => go({ ...state, page: 1, ...patch });
  const clear = () => go(clearedFind(state));
  const onText = (value: string) => {
    setTyped((t) => (live ? { ...t, text: value } : { text: value, base: url.q, pending: null }));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const current = parseFind(new URLSearchParams(window.location.search));
      setTyped((t) => ({ ...t, base: current.q, pending: value }));
      replaceQuery(findHref({ ...current, q: value, page: 1 }));
    }, 450);
  };
  const remember = () => rememberFindWork(findHref(state));

  const counts = {
    find: findWork(s, {}).total,
    ordered: commissionsForBusiness(s).filter(isActive).length,
    making: commissionsForCreator(s).filter(isActive).length,
  };
  const facets = tab === "find" ? findWork(s, toWorkQuery(state)).facets : undefined;
  const setTab = (next: WorkTab | "prod") => {
    if (next === "prod") router.push(paths.productivity);
    else router.replace(paths.work(next), { scroll: false });
  };

  return (
    <TakeWorkProvider>
      <WidePage className="y-workpage">
        <header className="y-work-head">
          <h1 className="y-display y-t-display">Work</h1>
          <p className="y-lead y-fg-2">Everything in flight, on both sides of a deal.</p>
        </header>

        <div className="y-wk">
          <aside className="y-block y-wnav" data-tone="paper" aria-label="Work sections">
            <nav className="y-wn" aria-label="Work">
              <NavItem tab="find" current={tab} icon={<Search size={18} strokeWidth={1.9} />} count={counts.find}>
                Find work
              </NavItem>
              <div className="y-wn-g">Your work</div>
              <NavItem tab="ordered" current={tab} icon={<ShoppingBag size={18} strokeWidth={1.9} />} sub="as a brand" count={counts.ordered}>
                Ordered
              </NavItem>
              <NavItem tab="making" current={tab} icon={<Clapperboard size={18} strokeWidth={1.9} />} sub="as a creator" count={counts.making}>
                Making
              </NavItem>
              <Link href={paths.productivity} className="y-wn-i">
                <span className="y-wn-ic" aria-hidden>
                  <BarChart3 size={18} strokeWidth={1.9} />
                </span>
                <span className="y-wn-l">Productivity</span>
              </Link>
            </nav>
            {tab === "find" && facets ? (
              <FindFilters state={state} facets={facets} onChange={update} onClear={clear} />
            ) : null}
          </aside>

          <div className="y-wmain">
            {step.urgent ? (
              <NeedsYouBlock step={step} showSide={Boolean(me.creator(s))} className="y-enter y-needs-wrap" />
            ) : null}

            <div className="y-wbar" data-empty={tab === "find" ? "true" : undefined}>
              <SegmentedToggle<WorkTab | "prod">
                label="Work sections"
                size="md"
                fill
                phoneCounts={false}
                className="y-mainseg"
                value={tab}
                onChange={setTab}
                options={[
                  { value: "find", label: "Find work", count: counts.find },
                  { value: "ordered", label: "Ordered", count: counts.ordered },
                  { value: "making", label: "Making", count: counts.making },
                  { value: "prod", label: "Productivity" },
                ]}
              />
              <MoneyLine tab={tab} />
            </div>

            <p className="y-tabhelp">{help[tab]}</p>

            <div key={tab} className="y-enter">
              {tab === "find" ? (
                <FindWork
                  state={state}
                  text={text}
                  onText={onText}
                  onSearch={() => go(state)}
                  update={update}
                  clear={clear}
                  onOpenFilters={() => setFiltersOpen(true)}
                  onOpen={remember}
                />
              ) : tab === "ordered" ? (
                <OrderedView />
              ) : (
                <MakingView />
              )}
            </div>
          </div>
        </div>
      </WidePage>

      {tab === "find" && facets ? (
        <Sheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title="Filters"
          description="Counts show what's open with your other filters."
          width="sm"
          footer={
            <SheetActions>
              <PillButton variant="soft" onClick={clear}>
                Clear all
              </PillButton>
              <PillButton variant="contrast" onClick={() => setFiltersOpen(false)}>
                Show {num(findWork(s, toWorkQuery(state)).total)} results
              </PillButton>
            </SheetActions>
          }
        >
          <FindFilters state={state} facets={facets} onChange={update} onClear={clear} showHead={false} />
        </Sheet>
      ) : null}
    </TakeWorkProvider>
  );
}

function NavItem({
  tab,
  current,
  icon,
  sub,
  count,
  children,
}: {
  tab: WorkTab;
  current: WorkTab;
  icon: React.ReactNode;
  sub?: string;
  count: number;
  children: React.ReactNode;
}) {
  const on = tab === current;
  return (
    <Link href={paths.work(tab)} className="y-wn-i" aria-current={on ? "true" : undefined}>
      <span className="y-wn-ic" aria-hidden>
        {icon}
      </span>
      <span className="y-wn-l">{children}</span>
      {sub ? <span className="y-wn-sub">{sub}</span> : null}
      <span className="y-wn-n y-num">{count}</span>
    </Link>
  );
}

/** One quiet money line on Ordered and Making: what's held for your orders, or what's coming to you. */
function MoneyLine({ tab }: { tab: WorkTab }) {
  const s = useDemo();
  if (tab === "ordered") {
    const held = businessSpend(s).held;
    return (
      <p className="y-moneyline">
        <ShieldCheck size={16} aria-hidden className="flex-none" />
        <span>
          <b className="y-num">{money(held)}</b> held for your orders · <Link href={paths.billing}>Billing</Link>
        </span>
      </p>
    );
  }
  if (tab === "making" && me.creator(s)) {
    const earnings = creatorEarnings(s);
    const parts = [
      `${moneyExact(earnings.available)} to withdraw`,
      earnings.pending ? `${moneyExact(earnings.pending)} pending` : "",
      earnings.held ? `${moneyExact(earnings.held)} held for you` : "",
    ]
      .filter(Boolean)
      .slice(0, 2);
    return (
      <p className="y-moneyline">
        <Wallet size={16} aria-hidden className="flex-none" />
        <span>
          <span className="y-num">{parts.join(" · ")}</span> · <Link href={paths.wallet}>Wallet</Link>
        </span>
      </p>
    );
  }
  // Find work: the line keeps its place so the page doesn't jump between sections.
  return <p className="y-moneyline" data-hidden="true" aria-hidden />;
}

/** Placeholder in the page's shape until the saved demo state has loaded. */
export function WorkSkeleton() {
  return (
    <WidePage className="y-workpage">
      <div aria-busy="true" aria-label="Loading your work">
        <div className="y-work-head">
          <Skeleton className="h-12 w-40" />
          <Skeleton className="mt-3 h-5 w-80" />
        </div>
        <div className="y-wk" aria-hidden>
          <div className="y-block y-wnav flex flex-col gap-2" data-tone="paper">
            <Skeleton className="h-12 w-full !rounded-2xl" />
            <Skeleton className="h-12 w-full !rounded-2xl" />
            <Skeleton className="h-12 w-full !rounded-2xl" />
          </div>
          <div className="y-wmain flex flex-col gap-4">
            <Skeleton className="h-40 w-full !rounded-(--y-r-block)" />
            <Skeleton className="h-36 w-full !rounded-(--y-r-block)" />
            <div className="grid gap-3 md:grid-cols-3">
              <Skeleton className="h-72 w-full !rounded-(--y-r-block)" />
              <Skeleton className="h-72 w-full !rounded-(--y-r-block)" />
              <Skeleton className="h-72 w-full !rounded-(--y-r-block)" />
            </div>
          </div>
        </div>
      </div>
    </WidePage>
  );
}
