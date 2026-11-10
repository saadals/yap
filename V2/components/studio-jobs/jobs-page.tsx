"use client";

import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { CreatorSetupSheet } from "@/components/account/creator-setup-sheet";
import { BusinessLogo } from "@/components/domain/business-logo";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { List } from "@/components/ui/list";
import { Page, PageHeader, SectionLabel } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { plural } from "@/lib/format";
import { paths, type StudioJobsTab } from "@/lib/paths";
import { businessById, commissionsForCreator, me, pitchesForCreator } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";
import type { Commission } from "@/lib/types";

import { ItemRow } from "./item-row";
import { JobAmount, JobChip, inProgressOrder, isOpenJob, jobAmount, jobMeta, needsYou, needsYouOrder } from "./job-status";
import { PitchLists, isOpenPitch } from "./pitch-rows";
import { SetupPrompt } from "./setup-prompt";

const TABS: StudioJobsTab[] = ["active", "pitches", "done"];

/**
 * /studio/jobs: a creator's work in three tabs (`?tab=active|pitches|done`). Active groups what's
 * waiting on you above what's in progress; Pitches splits open from decided; Done lists paid work
 * (with the brand's rating) and work that ended. Every amount is the price with what you earn after
 * Yapp's 20% ("$480 · you earn $384"). Uses `useSearchParams`: render inside <Suspense>.
 */
export function JobsPage() {
  const s = useDemo();
  const hydrated = useHydrated();
  const params = useSearchParams();
  const [setupOpen, setSetupOpen] = useState(false);
  const param = params.get("tab") as StudioJobsTab | null;
  const tab: StudioJobsTab = param && TABS.includes(param) ? param : "active";

  if (!hydrated) return <JobsSkeleton />;
  const creator = me.creator(s);

  return (
    <Page>
      <PageHeader
        title="Jobs"
        actions={
          creator ? (
            <PillButton href={paths.findWork()} variant="outline" icon={<Search size={16} aria-hidden />}>
              Find work
            </PillButton>
          ) : null
        }
      />
      {creator ? (
        <JobsBody key={creator.id} tab={tab} />
      ) : (
        <SetupPrompt
          title="Your jobs live here"
          body="Set up a creator profile to pitch on custom orders, pick UGC campaign slots and accept direct offers. Every job and pitch shows up on this page, with what you earn on each."
          onSetUp={() => setSetupOpen(true)}
        />
      )}
      <CreatorSetupSheet open={setupOpen} onClose={() => setSetupOpen(false)} reason="to take on jobs" />
    </Page>
  );
}

function JobsBody({ tab }: { tab: StudioJobsTab }) {
  const s = useDemo();
  const jobs = commissionsForCreator(s);
  const pitches = pitchesForCreator(s);
  const open = jobs.filter(isOpenJob);
  const done = jobs.filter((c) => !isOpenJob(c));
  const waiting = pitches.filter((p) => isOpenPitch(s, p)).length;

  return (
    <>
      <Tabs
        label="Jobs"
        value={tab}
        items={[
          { id: "active", label: "Active", count: open.length, href: paths.studioJobs() },
          { id: "pitches", label: "Pitches", count: waiting || undefined, href: paths.studioJobs({ tab: "pitches" }) },
          { id: "done", label: "Done", href: paths.studioJobs({ tab: "done" }) },
        ]}
      />
      <div key={tab} className="y-enter">
        {tab === "active" ? <ActiveTab jobs={open} /> : tab === "pitches" ? <PitchesTab /> : <DoneTab jobs={done} />}
      </div>
    </>
  );
}

function JobRow({ commission, rating = false }: { commission: Commission; rating?: boolean }) {
  const s = useDemo();
  const business = businessById(s, commission.businessId);
  return (
    <ItemRow
      href={paths.job(commission.id)}
      lead={business ? <BusinessLogo business={business} size={40} /> : null}
      title={commission.title}
      meta={jobMeta(s, commission, { rating })}
      chip={<JobChip commission={commission} />}
      amount={jobAmount(commission) !== undefined ? <JobAmount commission={commission} /> : undefined}
    />
  );
}

function Group({ id, title, count, children, first }: { id: string; title: string; count?: number; children: React.ReactNode; first?: boolean }) {
  return (
    <section aria-labelledby={id}>
      <SectionLabel id={id} className={first ? "!pt-6" : ""}>
        {title}
        {count ? <span className="y-fg-2 y-num ms-2 font-normal">{count}</span> : null}
      </SectionLabel>
      <List label={title}>{children}</List>
    </section>
  );
}

function ActiveTab({ jobs }: { jobs: Commission[] }) {
  const needs = jobs.filter(needsYou).sort(needsYouOrder);
  const moving = jobs.filter((c) => !needsYou(c)).sort(inProgressOrder);
  if (!jobs.length) {
    return (
      <Empty
        title="Nothing in progress"
        body="Pitch on a custom order, pick a UGC campaign slot or accept a direct offer, and the work shows up here from brief to payment."
      />
    );
  }
  return (
    <>
      {needs.length ? (
        <Group id="jobs-needs" title="Needs you" count={needs.length} first>
          {needs.map((c) => (
            <JobRow key={c.id} commission={c} />
          ))}
        </Group>
      ) : null}
      {moving.length ? (
        <Group id="jobs-moving" title="In progress" count={moving.length} first={!needs.length}>
          {moving.map((c) => (
            <JobRow key={c.id} commission={c} />
          ))}
        </Group>
      ) : null}
    </>
  );
}

function PitchesTab() {
  const s = useDemo();
  const pitches = pitchesForCreator(s);
  if (!pitches.length) {
    return (
      <Empty
        title="No pitches yet"
        body="Find a custom order that fits what you make, write a short pitch and attach your closest samples. It takes about five minutes."
      />
    );
  }
  const live = pitches.filter((p) => p.status !== "withdrawn");
  const shortlisted = live.filter((p) => p.status === "shortlisted").length;
  const hired = live.filter((p) => p.status === "hired").length;
  return (
    <>
      <p className="y-small y-fg-2 pt-4">
        {plural(live.length, "pitch", "pitches")} sent · {shortlisted} shortlisted · {hired} hired
      </p>
      <PitchLists pitches={pitches} />
    </>
  );
}

function DoneTab({ jobs }: { jobs: Commission[] }) {
  const finished = jobs
    .filter((c) => c.status === "completed")
    .sort((a, b) => Date.parse(b.completedAt ?? b.createdAt) - Date.parse(a.completedAt ?? a.createdAt));
  const ended = jobs
    .filter((c) => c.status !== "completed")
    .sort((a, b) => Date.parse(b.completedAt ?? b.createdAt) - Date.parse(a.completedAt ?? a.createdAt));
  if (!jobs.length) {
    return (
      <Empty
        title="Nothing finished yet"
        body="Approved, paid work collects here with the brand's rating, so you can see how you're doing."
      />
    );
  }
  return (
    <>
      {finished.length ? (
        <Group id="jobs-done" title="Completed" count={finished.length} first>
          {finished.map((c) => (
            <JobRow key={c.id} commission={c} rating />
          ))}
        </Group>
      ) : null}
      {ended.length ? (
        <Group id="jobs-ended" title="Cancelled and declined" count={ended.length} first={!finished.length}>
          {ended.map((c) => (
            <JobRow key={c.id} commission={c} />
          ))}
        </Group>
      ) : null}
    </>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <Block tone="paper" pad="md" className="mt-6">
      <EmptyState
        headingLevel={2}
        title={title}
        body={body}
        action={
          <PillButton href={paths.findWork()} variant="neon" arrow>
            Find work
          </PillButton>
        }
      />
    </Block>
  );
}

/** Placeholder in the page's shape until the saved demo state has loaded. */
export function JobsSkeleton() {
  return (
    <Page>
      <div aria-busy="true" aria-label="Loading your jobs">
        <div className="pb-5 md:pb-6">
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="flex gap-6 border-b border-(--y-line) pb-3" aria-hidden>
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
        <Skeleton className="mt-8 mb-3 h-5 w-28" />
        <div data-tone="paper" className="y-block flex flex-col" aria-hidden>
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="flex items-center gap-3 px-5 py-4">
              <Skeleton className="size-10 !rounded-[12px]" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-6 w-24 !rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}
