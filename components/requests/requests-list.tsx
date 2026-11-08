"use client";

import { FilePen, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { RequestCard } from "@/components/domain/request-card";
import { AppShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { JobCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { DAY, NOW } from "@/lib/clock";
import { plural, timeOf } from "@/lib/format";
import { paths } from "@/lib/paths";
import { campaignAttention, isCampaign, me, pitchesForRequest, requestsForBusiness } from "@/lib/selectors";
import { useDemo, useHydrated, type DemoState } from "@/lib/store";
import type { ContentRequest } from "@/lib/types";

import { STEPS } from "./shared";

type Tab = "open" | "drafts" | "hired" | "closed" | "all";
const TABS: { id: Tab; label: string; match: (r: ContentRequest) => boolean }[] = [
  // A full campaign is still running (videos in review, posts due), so it stays under Open.
  { id: "open", label: "Open", match: (r) => r.status === "open" || (isCampaign(r) && r.status === "hired") },
  { id: "drafts", label: "Drafts", match: (r) => r.status === "draft" },
  { id: "hired", label: "Hired", match: (r) => !isCampaign(r) && r.status === "hired" },
  { id: "closed", label: "Closed", match: (r) => r.status === "closed" },
  { id: "all", label: "All", match: () => true },
];
const isTab = (value: string | null): value is Tab => TABS.some((t) => t.id === value);

/** /orders: everything the signed-in account ordered (custom requests and UGC campaigns). */
export function OrdersListPage() {
  const s = useDemo();
  const hydrated = useHydrated();
  const fresh = hydrated ? newPitchCount(s) : 0;
  const toReview = hydrated
    ? campaignAttention(s).reduce((sum, item) => sum + item.progress.review, 0)
    : 0;
  const description =
    [
      fresh ? `${plural(fresh, "new pitch", "new pitches")} since yesterday` : null,
      toReview ? `${plural(toReview, "campaign video")} to review` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Custom requests and UGC campaigns you've placed.";
  return (
    <AppShell>
      <Page>
        <PageHeader
          title="Orders"
          description={description}
          actions={
            <PillButton href={paths.newOrder()} variant="neon" arrow icon={<Plus size={18} aria-hidden />}>
              New order
            </PillButton>
          }
        />
        <Suspense fallback={<ListSkeleton />}>
          <RequestsList />
        </Suspense>
      </Page>
    </AppShell>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading orders">
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-11 w-24" />
        ))}
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        <JobCardSkeleton />
        <JobCardSkeleton />
      </div>
    </div>
  );
}

/** Pitches that arrived on published custom requests in the last day. */
function newPitchCount(s: DemoState) {
  const since = NOW - DAY;
  return requestsForBusiness(s)
    .filter((r) => r.status !== "draft" && !isCampaign(r))
    .flatMap((r) => pitchesForRequest(s, r.id))
    .filter((p) => Date.parse(p.sentAt) >= since).length;
}

function RequestsList() {
  const s = useDemo();
  const hydrated = useHydrated();
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState("");

  if (!hydrated) return <ListSkeleton />;

  const requests = requestsForBusiness(s);
  const tabParam = params.get("tab");
  const tab: Tab = isTab(tabParam) ? tabParam : "open";
  const unfinished = me.draft(s);
  // The wizard's autosaved request counts as a draft too.
  const count = (t: (typeof TABS)[number]) =>
    requests.filter(t.match).length + (t.id === "drafts" && unfinished ? 1 : 0);
  const active = TABS.find((t) => t.id === tab)!;
  // Quiet chips: tabs with nothing in them stay out of the way (unless selected).
  const shownTabs = TABS.filter((t) => t.id === "open" || t.id === "all" || t.id === tab || count(t) > 0);
  const q = query.trim().toLowerCase();
  const visible = requests.filter(active.match).filter((r) => !q || r.title.toLowerCase().includes(q));

  const setTab = (next: Tab) =>
    router.replace(paths.orders({ tab: next === "open" ? undefined : next }), { scroll: false });

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 pb-1 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label="Filter orders by status"
          className="y-scroll-x -mx-(--y-gutter) flex gap-2 px-(--y-gutter) lg:mx-0 lg:px-0"
        >
          {shownTabs.map((t) => (
            <FilterChip key={t.id} pressed={tab === t.id} count={count(t)} onClick={() => setTab(t.id)}>
              {t.label}
            </FilterChip>
          ))}
        </div>
        <label className="flex min-h-12 items-center gap-2 rounded-full bg-(--y-paper) px-4 lg:w-80">
          <Search size={18} aria-hidden className="flex-none" />
          <span className="sr-only">Search orders by title</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title"
            className="h-12 w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:text-(--y-ink-3)"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="y-round"
              data-tone-btn="soft"
              data-size="sm"
              aria-label="Clear search"
            >
              <X size={16} aria-hidden />
            </button>
          ) : null}
        </label>
      </div>

      {tab === "drafts" && unfinished && !q ? (
        <Block tone="mist" pad="md" className="y-hoverable relative flex flex-wrap items-center gap-4">
          <span className="y-round flex-none" data-tone-btn="contrast" aria-hidden>
            <FilePen size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="y-head">
              <Link
                href={paths.newOrder({ type: "custom" })}
                className="after:absolute after:inset-0 after:rounded-(--y-r-block) after:content-['']"
              >
                {unfinished.title || "Unfinished request"}
              </Link>
            </h2>
            <p className="y-small y-fg-2">
              Custom request · step {unfinished.step + 1} of {STEPS.length} · saved {timeOf(unfinished.savedAt)}
            </p>
          </div>
          <span className="y-pill relative z-[3]" data-variant="contrast" data-size="sm" aria-hidden>
            Continue
          </span>
        </Block>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {plural(visible.length, "order")} shown
      </p>

      {visible.length ? (
        <div className="grid gap-2 lg:grid-cols-2">
          {visible.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              perspective="business"
              href={
                request.status === "draft" && !isCampaign(request)
                  ? paths.newOrder({ draft: request.id })
                  : paths.order(request.id)
              }
            />
          ))}
        </div>
      ) : q ? (
        <Block tone="paper" pad="md">
          <EmptyState
            title={`No orders match "${query.trim()}"`}
            body="Try a shorter word from the title, or clear the search to see everything in this tab."
            shape="ball"
            tint="sea"
            action={
              <PillButton variant="contrast" onClick={() => setQuery("")}>
                Clear search
              </PillButton>
            }
          />
        </Block>
      ) : tab === "drafts" && unfinished ? null : (
        <Block tone="paper" pad="md">
          <TabEmpty tab={tab} onAll={() => setTab("all")} hasAny={requests.length > 0} />
        </Block>
      )}
    </div>
  );
}

function TabEmpty({ tab, onAll, hasAny }: { tab: Tab; onAll: () => void; hasAny: boolean }) {
  const newButton = (
    <PillButton href={paths.newOrder()} variant="contrast" arrow>
      Place an order
    </PillButton>
  );
  if (tab === "open")
    return (
      <EmptyState
        title="No open orders"
        body="Run a UGC campaign for 10 or more videos, or describe one video and let creators pitch. Most orders hear back within hours."
        shape="pill"
        tint="mint"
        face="smile"
        action={newButton}
      />
    );
  if (tab === "drafts")
    return (
      <EmptyState
        title="No drafts"
        body="Requests you save without publishing land here, so you can finish them later."
        shape="dome"
        tint="violet"
        face="calm"
        action={newButton}
      />
    );
  if (tab === "hired")
    return (
      <EmptyState
        title="Nobody hired yet"
        body="When you hire from a pitch, the request moves here and the work shows up in Work."
        shape="tower"
        tint="sun"
        face="focus"
        action={
          <PillButton href={paths.orders()} variant="contrast">
            See open orders
          </PillButton>
        }
      />
    );
  if (tab === "closed")
    return (
      <EmptyState
        title="Nothing closed"
        body="Close an order when you've found who you need. You can reopen a request any time."
        shape="ball"
        tint="sea"
        face="sleepy"
        action={
          hasAny ? (
            <PillButton variant="contrast" onClick={onAll}>
              See all orders
            </PillButton>
          ) : undefined
        }
      />
    );
  return (
    <EmptyState
      title="Place your first order"
      body="Tell creators what you need once. Pick a UGC campaign for many videos at a fixed price, or a custom request to compare pitches."
      shape="bean"
      tint="coral"
      face="smile"
      action={newButton}
    />
  );
}
