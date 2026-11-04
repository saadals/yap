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
import { pitchesForRequest, requestsForBusiness } from "@/lib/selectors";
import { useDemo, useHydrated, type DemoState } from "@/lib/store";
import type { ContentRequest, RequestStatus } from "@/lib/types";

import { durationLabel, median } from "./shared";

type Tab = "open" | "drafts" | "hired" | "closed" | "all";
const TABS: { id: Tab; label: string; status?: RequestStatus }[] = [
  { id: "open", label: "Open", status: "open" },
  { id: "drafts", label: "Drafts", status: "draft" },
  { id: "hired", label: "Hired", status: "hired" },
  { id: "closed", label: "Closed", status: "closed" },
  { id: "all", label: "All" },
];
const isTab = (value: string | null): value is Tab => TABS.some((t) => t.id === value);

export function RequestsListPage() {
  return (
    <AppShell role="business">
      <Page>
        <PageHeader
          title="Requests"
          description="Everything you've asked creators to pitch on. Open a request to compare pitches side by side and hire."
          actions={
            <PillButton href="/business/requests/new" variant="neon" arrow icon={<Plus size={18} aria-hidden />}>
              New request
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
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading requests">
      <div className="grid gap-2 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="y-block y-pad-md flex flex-col gap-3" data-tone="paper">
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-6">
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

function stats(s: DemoState, requests: ContentRequest[]) {
  const live = requests.filter((r) => r.status !== "draft");
  const since = NOW - DAY;
  let newPitches = 0;
  let total = 0;
  const firstPitchMs: number[] = [];
  const freshOn: ContentRequest[] = [];
  for (const request of live) {
    const pitches = pitchesForRequest(s, request.id);
    total += pitches.length;
    const fresh = pitches.filter((p) => Date.parse(p.sentAt) >= since).length;
    newPitches += fresh;
    if (fresh) freshOn.push(request);
    if (pitches.length) {
      const first = Math.min(...pitches.map((p) => Date.parse(p.sentAt)));
      const gap = first - Date.parse(request.postedAt);
      if (gap > 0) firstPitchMs.push(gap);
    }
  }
  return {
    newPitches,
    freshOn,
    average: live.length ? total / live.length : 0,
    firstPitch: firstPitchMs.length ? durationLabel(median(firstPitchMs)) : null,
    liveCount: live.length,
  };
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
  const count = (t: (typeof TABS)[number]) =>
    t.status ? requests.filter((r) => r.status === t.status).length : requests.length;
  const active = TABS.find((t) => t.id === tab)!;
  const q = query.trim().toLowerCase();
  const visible = requests
    .filter((r) => !active.status || r.status === active.status)
    .filter((r) => !q || r.title.toLowerCase().includes(q));
  const summary = stats(s, requests);
  const unfinished = s.requestDraft;

  const setTab = (next: Tab) =>
    router.replace(next === "open" ? "/business/requests" : `/business/requests?tab=${next}`, { scroll: false });

  return (
    <div className="flex flex-col gap-2">
      {/* Summary */}
      <div className="grid gap-2 sm:grid-cols-3">
        <Block tone="lavender" pad="md" className="flex flex-col gap-1">
          <p className="y-display y-num text-[44px] leading-none font-semibold tracking-[-0.04em]">
            {summary.newPitches}
          </p>
          <p className="y-small font-semibold">new {summary.newPitches === 1 ? "pitch" : "pitches"} since yesterday</p>
          <p className="y-micro y-fg-2">
            {summary.freshOn.length ? (
              <>
                On{" "}
                <Link href={`/business/requests/${summary.freshOn[0].id}`} className="y-link font-semibold">
                  {summary.freshOn[0].title}
                </Link>
                {summary.freshOn.length > 1 ? ` and ${plural(summary.freshOn.length - 1, "other")}` : ""}
              </>
            ) : (
              "We'll let you know the moment one arrives."
            )}
          </p>
        </Block>
        <Block tone="paper" pad="md" className="flex flex-col gap-1">
          <p className="y-display y-num text-[44px] leading-none font-semibold tracking-[-0.04em]">
            {summary.average ? summary.average.toFixed(1) : "0"}
          </p>
          <p className="y-small font-semibold">pitches per request, on average</p>
          <p className="y-micro y-fg-2">Across {plural(summary.liveCount, "published request")}.</p>
        </Block>
        <Block tone="paper" pad="md" className="flex flex-col gap-1">
          <p className="y-display y-num text-[44px] leading-none font-semibold tracking-[-0.04em]">
            {summary.firstPitch ?? "3h"}
          </p>
          <p className="y-small font-semibold">typical time to first pitch</p>
          <p className="y-micro y-fg-2">
            {summary.firstPitch ? "Median across your requests." : "Typical across Yapp. Yours will show here."}
          </p>
        </Block>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 pt-6 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label="Filter requests by status"
          className="y-scroll-x -mx-(--y-gutter) flex gap-2 px-(--y-gutter) lg:mx-0 lg:px-0"
        >
          {TABS.map((t) => (
            <FilterChip key={t.id} pressed={tab === t.id} count={count(t)} onClick={() => setTab(t.id)}>
              {t.label}
            </FilterChip>
          ))}
        </div>
        <label className="flex min-h-12 items-center gap-2 rounded-full bg-(--y-paper) px-4 lg:w-80">
          <Search size={18} aria-hidden className="flex-none" />
          <span className="sr-only">Search requests by title</span>
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
              <Link href="/business/requests/new" className="after:absolute after:inset-0 after:rounded-(--y-r-block) after:content-['']">
                {unfinished.title || "Unfinished request"}
              </Link>
            </h2>
            <p className="y-small y-fg-2">
              Still in the wizard · step {unfinished.step + 1} of 8 · saved {timeOf(unfinished.savedAt)}
            </p>
          </div>
          <span className="y-pill relative z-[3]" data-variant="contrast" data-size="sm" aria-hidden>
            Continue
          </span>
        </Block>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {plural(visible.length, "request")} shown
      </p>

      {visible.length ? (
        <div className="grid gap-2 lg:grid-cols-2">
          {visible.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              perspective="business"
              href={
                request.status === "draft"
                  ? `/business/requests/new?draft=${request.id}`
                  : `/business/requests/${request.id}`
              }
            />
          ))}
        </div>
      ) : q ? (
        <Block tone="paper" pad="md">
          <EmptyState
            title={`No requests match "${query.trim()}"`}
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
    <PillButton href="/business/requests/new" variant="contrast" arrow>
      Start a request
    </PillButton>
  );
  if (tab === "open")
    return (
      <EmptyState
        title="No open requests"
        body="Describe the video you need and creators who speak your audience's language will pitch, usually within hours."
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
        body="When you hire from a pitch, the request moves here and the work shows up in Commissions."
        shape="tower"
        tint="sun"
        face="focus"
        action={
          <PillButton href="/business/requests" variant="contrast">
            See open requests
          </PillButton>
        }
      />
    );
  if (tab === "closed")
    return (
      <EmptyState
        title="Nothing closed"
        body="Close a request when you've found who you need. You can reopen it any time."
        shape="ball"
        tint="sea"
        face="sleepy"
        action={
          hasAny ? (
            <PillButton variant="contrast" onClick={onAll}>
              See all requests
            </PillButton>
          ) : undefined
        }
      />
    );
  return (
    <EmptyState
      title="Post your first request"
      body="Tell creators what you need once. They pitch with an angle, a price and real samples, and you pick who fits."
      shape="bean"
      tint="coral"
      face="smile"
      action={newButton}
    />
  );
}
