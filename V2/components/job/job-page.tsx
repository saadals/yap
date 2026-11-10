"use client";

import "@/app/styles/job.css";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { defaultMode, homeFor, modeForSide } from "@/lib/mode";
import {
  businessById,
  commissionById,
  commissionTotals,
  creatorById,
  isAdCopy,
  latestDelivery,
  me,
  productById,
  sideOf,
  unreadComments,
} from "@/lib/selectors";
import { actions, useDemo, useHydrated } from "@/lib/store";
import type { Commission, Role } from "@/lib/types";

import type { CompletedFlow } from "./completed";
import { JobHeader, PhoneBar, StickyStrip } from "./header";
import { cash, reveal, slotContext, unreadIds, type CommentFocus, type Job, type SheetName } from "./helpers";
import { nextAction } from "./next-action";
import { Rail } from "./rail";
import { JobSheets } from "./sheets";
import { StagePanel } from "./stage-panel";
import { COMPOSER_ID, Timeline } from "./timeline";

const STAGE_ID = "job-stage";

/**
 * One job (a commission) for whoever is looking, at /jobs/[id]. The side comes from the signed-in
 * account and sets the shell's mode (Ordering or Studio). A header with the single next step, a
 * stage panel that follows the job's state, one timeline (messages, versions and events) and a
 * side rail with money, dates, the brief and files.
 */
export function JobPage({ id }: { id: string }) {
  const s = useDemo();
  const hydrated = useHydrated();
  const commission = commissionById(s, id);
  const side = commission ? sideOf(s, commission) : undefined;

  if (!hydrated) {
    return (
      <AppShell>
        <JobSkeleton />
      </AppShell>
    );
  }
  if (!commission || !side) {
    return (
      <AppShell>
        <Missing exists={Boolean(commission)} />
      </AppShell>
    );
  }
  return (
    <AppShell mode={modeForSide(side)}>
      {/* `?comment=` / `?version=` are read with useSearchParams, which needs a boundary. */}
      <Suspense fallback={<JobSkeleton />}>
        <JobView key={`${commission.id}:${side}`} commission={commission} side={side} />
      </Suspense>
    </AppShell>
  );
}

function Missing({ exists }: { exists: boolean }) {
  const s = useDemo();
  const home = homeFor(defaultMode(me.account(s)));
  return (
    <Page>
      <h1 className="sr-only">Job</h1>
      <Block tone="paper" pad="lg" className="mt-2">
        <EmptyState
          headingLevel={2}
          title={exists ? "This job isn't in your account" : "We couldn't find that job"}
          body={
            exists
              ? "It belongs to another brand or creator. If it's yours, switch to that account from the menu."
              : "The link may be out of date. Everything you ordered or are making is one tap from Home."
          }
          action={
            <PillButton href={home} variant="contrast" arrow>
              Go to Home
            </PillButton>
          }
        />
      </Block>
    </Page>
  );
}

function JobSkeleton() {
  return (
    <Page>
      <div aria-busy="true" aria-label="Loading the job" className="flex flex-col gap-4">
        <Skeleton className="h-5 w-24" />
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-7 !rounded-full" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-2 w-full max-w-[720px]" />
        <div className="grid grid-cols-1 gap-6 pt-2 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div data-tone="paper" className="y-block y-pad-md flex flex-col gap-4">
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <div className="grid gap-6 md:grid-cols-[340px_1fr]">
              <Skeleton className="aspect-[9/16] w-full max-w-[340px]" />
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            </div>
          </div>
          <div data-tone="paper" className="y-block y-pad-md flex flex-col gap-3 max-lg:hidden">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    </Page>
  );
}

function JobView({ commission, side }: { commission: Commission; side: Role }) {
  const s = useDemo();
  const toast = useToast();
  const params = useSearchParams();
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [sheetKey, setSheetKey] = useState(0);
  const [picked, setPicked] = useState<{ id: string; count: number } | null>(null);
  const [tab, setTab] = useState<"timeline" | "details">("timeline");
  const [afterReview, setAfterReview] = useState(false);
  const [learningsDone, setLearningsDone] = useState(false);
  const [justApproved, setJustApproved] = useState(false);
  const [focus, setFocus] = useState<CommentFocus | undefined>();
  const [scrollTo, setScrollTo] = useState<{ commentId?: string; key: number } | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const deliveries = commission.deliveries;
  const latest = latestDelivery(commission);
  // A picked version holds until a new one arrives (then the newest shows).
  const selected = (picked && picked.count === deliveries.length ? deliveries.find((d) => d.id === picked.id) : undefined) ?? latest;
  const [viewed, setViewed] = useState<ReadonlySet<string>>(() => new Set(latest ? [latest.id] : []));

  // What was new to this side when the job opened (and anything that arrives while it's open), kept
  // for the visit so the "New" marks survive marking everything read below.
  const unreadNow = unreadIds(deliveries, side);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set(unreadNow));
  if (unreadNow.some((id) => !fresh.has(id))) setFresh(new Set([...fresh, ...unreadNow]));

  // Opening the job clears this side's unread comments and replies (badges elsewhere in the app).
  const unread = unreadComments(commission, side);
  useEffect(() => {
    if (unread > 0) actions.markCommentsRead(commission.id);
  }, [commission.id, unread]);

  // `?comment=` (notifications link here) and `?version=` open that version and that comment.
  // Applied while rendering when the query changes; the scroll happens in the effect below.
  const query = params.toString();
  const [seenQuery, setSeenQuery] = useState<string | null>(null);
  if (query !== seenQuery) {
    setSeenQuery(query);
    const commentId = params.get("comment") ?? undefined;
    const version = Number(params.get("version"));
    const owner = commentId
      ? deliveries.find((d) => d.comments.some((m) => m.id === commentId || m.replies.some((r) => r.id === commentId)))
      : undefined;
    const target = owner ?? (version ? deliveries.find((d) => d.version === version) : undefined);
    if (target) {
      setPicked(target.id === latest?.id ? null : { id: target.id, count: deliveries.length });
      if (!viewed.has(target.id)) setViewed(new Set([...viewed, target.id]));
      setFocus({ deliveryId: target.id, commentId: owner ? commentId : undefined, key: (focus?.key ?? 0) + 1 });
      setScrollTo({ commentId: owner ? commentId : undefined, key: (scrollTo?.key ?? 0) + 1 });
    }
  }
  useEffect(() => {
    if (!scrollTo) return;
    const frame = window.requestAnimationFrame(() => {
      const comment = scrollTo.commentId ? document.querySelector(`[data-comment="${scrollTo.commentId}"]`) : null;
      const panel = scrollTo.commentId ? null : document.querySelector("[data-comments]");
      reveal(comment ?? panel ?? document.getElementById(STAGE_ID), comment ? "center" : "start");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [scrollTo]);

  const openSheet = useCallback((name: SheetName) => {
    setSheetKey((key) => key + 1);
    setSheet(name);
    setFocus(undefined);
  }, []);

  const focusComposer = useCallback(() => {
    setTab("timeline");
    window.requestAnimationFrame(() => {
      const composer = document.getElementById(COMPOSER_ID);
      reveal(composer, "center");
      composer?.focus({ preventScroll: true });
    });
  }, []);

  const pickVersion = useCallback(
    (deliveryId: string | null) => {
      setPicked(deliveryId ? { id: deliveryId, count: deliveries.length } : null);
      const id = deliveryId ?? latest?.id;
      if (id) setViewed((set) => (set.has(id) ? set : new Set([...set, id])));
      setFocus(undefined);
      window.requestAnimationFrame(() => reveal(document.getElementById(STAGE_ID)));
    },
    [deliveries.length, latest?.id],
  );

  const showComments = useCallback(
    (deliveryId: string, commentId?: string) => {
      setPicked(deliveryId === latest?.id ? null : { id: deliveryId, count: deliveries.length });
      setViewed((set) => (set.has(deliveryId) ? set : new Set([...set, deliveryId])));
      setFocus((current) => ({ deliveryId, commentId, key: (current?.key ?? 0) + 1 }));
      setScrollTo((current) => ({ commentId, key: (current?.key ?? 0) + 1 }));
    },
    [deliveries.length, latest?.id],
  );

  const creator = creatorById(s, commission.creatorId);
  const business = businessById(s, commission.businessId);
  const slot = commission.source === "campaign" ? slotContext(s, commission) : undefined;
  const creatorName = creator?.firstName ?? "the creator";
  const businessName = business?.name ?? "the client";
  const totals = commissionTotals(commission);

  const job: Job = {
    commission,
    side,
    creator,
    business,
    product: productById(s, commission.brief.productId),
    totals,
    creatorName,
    businessName,
    otherName: side === "business" ? creatorName : businessName,
    latest,
    selected,
    slot,
    adCopy: isAdCopy(commission),
    noun: slot ? "review copy" : "version",
    fresh,
    viewed,
    focus,
    openSheet,
    focusComposer,
    pickVersion,
    showComments,
  };

  const action = nextAction(job, {
    afterReview,
    learningsDone,
    accept: () => {
      actions.acceptOffer(commission.id);
      toast({ message: `Offer accepted. ${cash(totals.creatorEarns)} is held for you. Time to make version 1.` });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    download: () =>
      toast({
        message: `Downloading ${latest?.files[0]?.name.replace(/[_-]?review[_-]?copy/i, "") ?? "the video"} in full quality, with the raw footage`,
        tone: "info",
      }),
  });

  const flow: CompletedFlow = {
    afterReview,
    learningsDone,
    justApproved,
    onReviewed: () => setAfterReview(true),
    onLearningsDone: () => setLearningsDone(true),
  };

  return (
    <>
      <Page className="pb-24 lg:pb-0">
        <JobHeader job={job} action={action} actionsRef={actionsRef} />

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
          <div className="flex min-w-0 flex-col gap-4">
            <div id={STAGE_ID} className="scroll-mt-[calc(var(--y-header-h)+16px)] lg:scroll-mt-[calc(var(--y-header-h)+72px)]">
              <StagePanel job={job} flow={flow} />
            </div>
            <SegmentedToggle
              label="Show"
              options={[
                { value: "timeline", label: "Timeline" },
                { value: "details", label: "Details" },
              ]}
              value={tab}
              onChange={setTab}
              size="md"
              className="w-full lg:hidden [&>button]:flex-1"
            />
            <div className={tab === "details" ? "max-lg:hidden" : ""}>
              <Timeline job={job} />
            </div>
          </div>
          <aside aria-label="Details" className={`job-rail min-w-0 ${tab === "timeline" ? "max-lg:hidden" : ""}`}>
            <Rail job={job} />
          </aside>
        </div>
      </Page>

      <StickyStrip job={job} action={action} watch={actionsRef} />
      <PhoneBar action={action} />
      <JobSheets
        job={job}
        sheet={sheet}
        sheetKey={sheetKey}
        onClose={() => setSheet(null)}
        onApproved={() => {
          setJustApproved(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onActed={() => window.setTimeout(() => reveal(document.getElementById(STAGE_ID)), 60)}
      />
    </>
  );
}
