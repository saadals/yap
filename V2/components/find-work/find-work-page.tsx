"use client";

import { ChevronDown, SearchX, Sparkles, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { CreatorSetupSheet } from "@/components/account/creator-setup-sheet";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { money } from "@/lib/format";
import { paths, type OrderType } from "@/lib/paths";
import { me, requestById } from "@/lib/selectors";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { FEE_PCT, formats, jobTypeById, jobTypes, languageById, languages, orderKinds } from "@/lib/taxonomy";
import type { FormatId, JobType, LanguageId } from "@/lib/types";

import { PickSheet, type CampaignRequest } from "@/components/opportunity/pick-sheet";

import "@/app/styles/studio-work.css";

import { WorkList, WorkRow } from "./work-row";
import { MIN_PAY_STEPS, SORTS, matches, sortItems, workItems, type WorkItem, type WorkSort } from "./work-items";

// Video formats only: ad copy is a job type, never a format filter.
const isFormat = (v: string | null): v is FormatId => formats.some((f) => f.id === v);
const isJob = (v: string | null): v is JobType => Boolean(v && v in jobTypeById);
const isLanguage = (v: string | null): v is LanguageId => Boolean(v && v in languageById);
const isSort = (v: string | null): v is WorkSort => SORTS.some((o) => o.value === v);

const KIND_LINE: Record<OrderType, string> = {
  custom: `The brand sets a budget and a deadline. You pitch your idea and your price, they pick, and you earn your price less Yapp's ${FEE_PCT}%.`,
  campaign: "The brand sets a price per Yapp and a follower tier. If you qualify, pick a Yapp and post it on your own account. First come, first served.",
};

/**
 * Find work: every open custom order and UGC campaign, ranked by how well it fits you. Tabs
 * (`?kind=`), filters (`job` for the job type, `format`, `lang`, `min`) and sort (`sort`) live in
 * the URL; "Not interested" hides an item, with "Show hidden (n)" (`hidden=1`). A campaign you
 * qualify for has "Pick now" on its row, which opens the pick sheet here. Without a creator profile
 * the list still works and the setup is offered once, at the top. The account's own orders never
 * show. Uses `useSearchParams`: render inside <Suspense>.
 */
export function FindWorkPage() {
  const s = useDemo();
  const hydrated = useHydrated();
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [setupOpen, setSetupOpen] = useState(false);
  const [pickId, setPickId] = useState<string | null>(null);

  if (!hydrated) return <FindWorkSkeleton />;

  const creator = me.creator(s);
  const kindParam = params.get("kind");
  const kind: OrderType | undefined = kindParam === "custom" || kindParam === "campaign" ? kindParam : undefined;
  // Campaigns are always full video, so the job type filter only applies outside that tab.
  const job = kind !== "campaign" && isJob(params.get("job")) ? (params.get("job") as JobType) : undefined;
  const format = job !== "ad-copy" && isFormat(params.get("format")) ? (params.get("format") as FormatId) : undefined;
  const lang = isLanguage(params.get("lang")) ? (params.get("lang") as LanguageId) : undefined;
  const min = Math.max(0, Number(params.get("min")) || 0);
  const sortParam = params.get("sort");
  const fallbackSort: WorkSort = creator ? "fit" : "newest";
  const sort: WorkSort = isSort(sortParam) && (creator || sortParam !== "fit") ? sortParam : fallbackSort;
  const showHidden = params.get("hidden") === "1";

  const go = (patch: Partial<{ kind: OrderType; job: string; format: string; lang: string; min: number; sort: string; hidden: 1 }>) => {
    const next = {
      kind,
      job,
      format,
      lang,
      min: min || undefined,
      sort: sort === fallbackSort ? undefined : sort,
      hidden: showHidden ? (1 as const) : undefined,
      ...patch,
    };
    router.replace(paths.findWork(next), { scroll: false });
  };

  const all = workItems(s);
  const hiddenCount = all.filter((i) => i.hidden).length;
  const pool = all.filter((i) => (showHidden ? true : !i.hidden) && matches(i, { job, format, lang, min }));
  const counts = {
    all: pool.length,
    custom: pool.filter((i) => i.kind === "custom").length,
    campaign: pool.filter((i) => i.kind === "campaign").length,
  };
  const list = sortItems(kind ? pool.filter((i) => i.kind === kind) : pool, sort);
  const filtered = Boolean(job || format || lang || min);
  const clearFilters = () => go({ job: undefined, format: undefined, lang: undefined, min: undefined });
  const picking = pickId ? requestById(s, pickId) : undefined;

  const hide = (item: WorkItem) => {
    actions.hideRequest(item.id);
    toast({
      message: "Hidden from Find work",
      action: { label: "Undo", onClick: () => actions.unhideRequest(item.id) },
    });
  };
  const unhide = (item: WorkItem) => {
    actions.unhideRequest(item.id);
    toast({ message: "Back in Find work" });
  };

  // Filter options: what's open right now (plus whatever is selected).
  const formatOptions = formats.filter(
    (f) => f.id === format || all.some((i) => i.request.brief.format === f.id),
  );
  const languageOptions = languages.filter(
    (l) => l.id === lang || all.some((i) => i.request.brief.languages.includes(l.id)),
  );
  const minOptions = [...new Set([...MIN_PAY_STEPS, min])].sort((a, b) => a - b);

  const tabHref = (k?: OrderType) =>
    paths.findWork({
      kind: k,
      job: k === "campaign" ? undefined : job,
      format,
      lang,
      min: min || undefined,
      sort: sort === fallbackSort ? undefined : sort,
      hidden: showHidden ? 1 : undefined,
    });

  return (
    <Page>
      <PageHeader
        title="Find work"
        description={
          creator
            ? "Custom orders to pitch on and UGC campaigns to pick from, best fit first. Every price shows what you earn."
            : "Custom orders to pitch on and UGC campaigns to pick from. Look around, then set up your profile to take one on."
        }
      />

      {!creator ? (
        <Block tone="paper" pad="md" className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 flex-none place-items-center rounded-full bg-(--y-mist)" aria-hidden>
              <Sparkles size={18} />
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="y-head">Set up your creator profile to pitch and pick</p>
              <p className="y-small y-fg-2">
                It takes a minute. Then this list is ranked by how well each brief fits you.
              </p>
            </div>
          </div>
          <PillButton variant="neon" arrow className="flex-none" onClick={() => setSetupOpen(true)}>
            Set up your creator profile
          </PillButton>
        </Block>
      ) : null}

      <Tabs
        label="Kind of work"
        value={kind ?? "all"}
        items={[
          { id: "all", label: "All", count: counts.all, href: tabHref() },
          { id: "custom", label: orderKinds.custom.name, count: counts.custom, href: tabHref("custom") },
          { id: "campaign", label: orderKinds.campaign.name, count: counts.campaign, href: tabHref("campaign") },
        ]}
      />

      <div className="flex flex-col gap-3 pt-4 pb-4 md:flex-row md:items-center md:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center" role="group" aria-label="Filters">
          {kind !== "campaign" ? (
            <PillSelect
              label="Job type"
              value={job ?? ""}
              onChange={(v) => go({ job: v || undefined, format: v === "ad-copy" ? undefined : format })}
              options={[{ value: "", label: "Any job type" }, ...jobTypes.map((j) => ({ value: j.id, label: j.name }))]}
            />
          ) : null}
          {job !== "ad-copy" ? (
            <PillSelect
              label="Format"
              value={format ?? ""}
              onChange={(v) => go({ format: v || undefined })}
              options={[{ value: "", label: "Any format" }, ...formatOptions.map((f) => ({ value: f.id, label: f.name }))]}
            />
          ) : null}
          <PillSelect
            label="Language"
            value={lang ?? ""}
            onChange={(v) => go({ lang: v || undefined })}
            options={[{ value: "", label: "Any language" }, ...languageOptions.map((l) => ({ value: l.id, label: l.name }))]}
          />
          <PillSelect
            label="Minimum pay"
            value={String(min)}
            onChange={(v) => go({ min: Number(v) || undefined })}
            options={minOptions.map((m) => ({ value: String(m), label: m ? `${money(m)}+ pay` : "Any pay" }))}
          />
          {filtered ? (
            <button
              type="button"
              className="y-small inline-flex min-h-9 items-center gap-1 rounded-full px-2 font-semibold"
              onClick={clearFilters}
            >
              <X size={15} aria-hidden /> Clear
            </button>
          ) : null}
        </div>
        <PillSelect
          label="Sort"
          value={sort}
          onChange={(v) => go({ sort: v === fallbackSort ? undefined : v })}
          options={SORTS.filter((o) => creator || o.value !== "fit").map((o) => ({ value: o.value, label: `Sort: ${o.label.toLowerCase()}` }))}
          neutral
        />
      </div>

      {kind ? <p className="y-small y-fg-2 -mt-1 pb-3">{KIND_LINE[kind]}</p> : null}

      {list.length ? (
        <WorkList label="Open work">
          {list.map((item) => (
            <WorkRow key={item.id} item={item} onHide={hide} onUnhide={unhide} onPick={(i) => setPickId(i.id)} />
          ))}
        </WorkList>
      ) : (
        <Block tone="paper" pad="md">
          <EmptyState
            title={filtered ? "Nothing matches these filters" : "Nothing open here right now"}
            body={
              filtered
                ? "Try another job type, format or language, or a lower minimum pay."
                : "New custom orders and UGC campaigns come in every week. We'll show them here first."
            }
            icon={<SearchX size={22} aria-hidden />}
            action={
              filtered ? (
                <PillButton variant="contrast" onClick={clearFilters}>
                  Clear filters
                </PillButton>
              ) : kind ? (
                <PillButton variant="contrast" href={tabHref()}>
                  See all open work
                </PillButton>
              ) : undefined
            }
          />
        </Block>
      )}

      {hiddenCount ? (
        <div className="flex justify-center pt-4">
          <PillButton variant="ghost" size="sm" onClick={() => go({ hidden: showHidden ? undefined : 1 })}>
            {showHidden ? "Leave hidden items out" : `Show hidden (${hiddenCount})`}
          </PillButton>
        </div>
      ) : null}

      <CreatorSetupSheet
        open={setupOpen}
        reason="to pitch on custom orders and pick UGC campaign Yapps"
        onClose={() => setSetupOpen(false)}
        onDone={() => setSetupOpen(false)}
      />
      {picking?.campaign ? (
        <PickSheet
          open
          request={picking as CampaignRequest}
          onClose={() => setPickId(null)}
          onFull={() => {
            setPickId(null);
            toast({ message: "Someone just took the last slot. If one reopens, it goes to the first creator who picks it." });
          }}
        />
      ) : null}
    </Page>
  );
}

/** A native select drawn as a pill (filled when a filter is set). */
function PillSelect({
  label,
  value,
  options,
  onChange,
  neutral = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  /** Never drawn as "set" (the sort always has a value). */
  neutral?: boolean;
}) {
  const set = !neutral && value !== "" && value !== "0";
  return (
    <span className="sw-select-wrap">
      <select
        aria-label={label}
        className="sw-select"
        data-set={set || undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={15} aria-hidden />
    </span>
  );
}

export function FindWorkSkeleton() {
  return (
    <Page>
      <div aria-busy="true" aria-label="Loading open work" className="flex flex-col gap-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-80 max-w-full" />
        <Skeleton className="mt-4 h-10 w-full" />
        <div data-tone="paper" className="y-block flex flex-col gap-4 p-5" aria-hidden>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-10 flex-none !rounded-xl" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

