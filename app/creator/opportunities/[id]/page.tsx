"use client";

import { ArrowLeft, CalendarDays, Clapperboard, Lock, MailOpen, PenLine, Wallet } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { CompetitionBlock, BusinessBlock, ProductContext } from "@/components/creator/opportunity-blocks";
import { MyPitchPanel } from "@/components/creator/my-pitch-panel";
import { PitchComposer } from "@/components/creator/pitch-composer";
import { replyWindow } from "@/components/creator/pitch-helpers";
import { FitPanel, BriefSummary } from "@/components/domain/brief-summary";
import { PitchBadge, RequestBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { Celebrate } from "@/components/ui/celebrate";
import { EmptyState } from "@/components/ui/empty-state";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/shell/app-shell";
import { daysFromNow, dueLabel, lengthLabel, moneyRange, plural, relativeDay, timeAgo, timeOf, weekdayDate } from "@/lib/format";
import {
  businessById,
  fit,
  me,
  myPitchFor,
  pitchesForRequest,
  portfolio,
  productById,
  requestById,
} from "@/lib/selectors";
import { ME, useDemo, useHydrated } from "@/lib/store";
import { aspects, formatById } from "@/lib/taxonomy";

export default function OpportunityPage() {
  return (
    <AppShell role="creator">
      <OpportunityDetail />
    </AppShell>
  );
}

function BackLink() {
  return (
    <div className="mb-2 flex items-center gap-2">
      <PillButton
        href="/creator/opportunities"
        variant="ghost"
        size="sm"
        icon={<ArrowLeft size={18} aria-hidden className="y-flip" />}
      >
        All opportunities
      </PillButton>
    </div>
  );
}

function LoadingState() {
  return (
    <Page>
      <BackLink />
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12" aria-busy="true" aria-label="Loading request">
        <div className="flex flex-col gap-2 lg:col-span-8">
          <div data-tone="paper" className="y-block y-pad-lg flex flex-col gap-5">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-12 w-4/5" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </div>
          <div data-tone="paper" className="y-block y-pad-md flex flex-col gap-3">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
        <div className="hidden flex-col gap-2 lg:col-span-4 lg:flex">
          <Skeleton className="h-64 !rounded-(--y-r-block)" />
          <Skeleton className="h-56 !rounded-(--y-r-block)" />
        </div>
      </div>
    </Page>
  );
}

function Unavailable({ title, body }: { title: string; body: string }) {
  return (
    <Page width="narrow">
      <BackLink />
      <h1 className="sr-only">{title}</h1>
      <Block tone="paper" pad="md">
        <EmptyState
          title={title}
          body={body}
          shape="tower"
          tint="sun"
          face="calm"
          action={
            <PillButton href="/creator/opportunities" variant="contrast" arrow>
              Browse open requests
            </PillButton>
          }
        />
      </Block>
    </Page>
  );
}

function OpportunityDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const s = useDemo();
  const hydrated = useHydrated();
  const [editing, setEditing] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);

  const request = requestById(s, id);
  if (!request) {
    if (!hydrated) return <LoadingState />;
    return (
      <Unavailable
        title="We couldn't find that request"
        body="It may have been removed by the business. Open requests that fit you are waiting in your feed."
      />
    );
  }

  const creator = me.creator(s);
  const myPitch = myPitchFor(s, request.id);
  const invited = request.invitedCreatorIds.includes(ME.creatorId);

  if (request.status === "draft") {
    return (
      <Unavailable
        title="This request isn't published yet"
        body="The business is still writing it. You'll see it in your feed once it's open for pitches."
      />
    );
  }
  if (request.visibility === "invite" && !invited && !myPitch) {
    return (
      <Unavailable
        title="This request is invite-only"
        body="The business picked a few creators to pitch on it. Keep your profile sharp so you get the next invite."
      />
    );
  }

  const business = businessById(s, request.businessId);
  const product = productById(s, request.brief.productId);
  const fitResult = fit(s, creator, request);
  const pitches = pitchesForRequest(s, request.id);
  const videos = portfolio(s, creator);
  const format = formatById[request.brief.format];
  const FormatIcon = format.icon;
  const due = dueLabel(request.dueDate);
  const isOpen = request.status === "open";
  const justSent = sentId !== null && myPitch?.id === sentId;
  const showComposer = isOpen && (!myPitch || editing);
  const businessName = business?.name ?? "The business";
  const aspectName = aspects.find((a) => a.id === request.brief.aspect)?.name ?? request.brief.aspect;

  return (
    <Page>
      <BackLink />
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 [&>*]:min-w-0">
        <div className="flex flex-col gap-2 lg:col-span-8">
          {/* Hero */}
          <Block tone="paper" pad="lg" className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-1.5">
              {invited ? (
                <Badge tone="ink" icon={<MailOpen size={14} aria-hidden />}>
                  {businessName} invited you
                </Badge>
              ) : null}
              {!isOpen ? <RequestBadge status={request.status} /> : null}
              {myPitch ? <PitchBadge status={myPitch.status} /> : null}
              <span className="y-chip">
                <FormatIcon size={14} aria-hidden /> {format.name}
              </span>
              <span className="y-micro y-fg-2 ms-1">
                Posted {timeAgo(request.postedAt)} · {plural(request.views, "view")}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <p className="y-small y-fg-2">
                {businessName}
                {product ? ` · ${product.name}` : ""}
              </p>
              <h1 className="y-display y-t-display max-w-[24ch]">{request.title}</h1>
            </div>
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div data-tone="butter" className="y-block flex flex-col gap-1 !rounded-(--y-r-tile) p-4">
                <dt className="y-micro y-fg-2 flex items-center gap-1.5">
                  <Wallet size={14} aria-hidden /> Budget
                </dt>
                <dd className="y-display y-num text-[30px] leading-none font-semibold tracking-[-0.03em]">
                  {moneyRange(request.budget.min, request.budget.max)}
                </dd>
                <dd className="y-micro y-fg-2">You keep 100%</dd>
              </div>
              <div className="y-tile flex flex-col gap-1 p-4">
                <dt className="y-micro y-fg-2 flex items-center gap-1.5">
                  <CalendarDays size={14} aria-hidden /> Final video due
                </dt>
                <dd className="y-head">{weekdayDate(request.dueDate)}</dd>
                <dd className={`y-micro ${due.urgency === "late" ? "text-(--y-danger)" : "y-fg-2"}`}>
                  {daysFromNow(request.dueDate) >= 0 ? `${relativeDay(request.dueDate).replace(/^in /, "In ")} · ${timeOf(request.dueDate)}` : "Deadline passed"}
                </dd>
              </div>
              <div className="y-tile flex flex-col gap-1 p-4">
                <dt className="y-micro y-fg-2 flex items-center gap-1.5">
                  <Clapperboard size={14} aria-hidden /> Deliverables
                </dt>
                <dd className="y-head">
                  {plural(request.brief.videoCount, "video")} · {lengthLabel(request.brief.durationSec)}
                </dd>
                <dd className="y-micro y-fg-2">{aspectName}</dd>
              </div>
            </dl>
          </Block>

          <div className="lg:hidden">
            <FitPanel fit={fitResult} />
          </div>

          {business ? <BusinessBlock business={business} /> : null}

          {/* Brief */}
          <Block tone="paper" pad="md" className="flex flex-col gap-6">
            <h2 className="y-display y-title">The brief</h2>
            <BriefSummary brief={request.brief} product={product} />
            {product ? <ProductContext product={product} /> : null}
          </Block>

          <div className="lg:hidden">
            <CompetitionBlock request={request} pitches={pitches} business={business} myPitch={myPitch} />
          </div>

          {/* Success */}
          {justSent && !editing ? (
            <Block tone="paper" pad="lg" className="y-enter flex flex-col items-center gap-4 text-center">
              <Celebrate className="h-32 w-52" />
              <div className="flex flex-col gap-2" role="status">
                <h2 className="y-display y-title">Sent! {businessName} usually replies {replyWindow(business)}.</h2>
                <p className="y-body y-fg-2 mx-auto max-w-[52ch]">
                  We&apos;ll tell you when they open it. You can edit or withdraw your pitch until they
                  shortlist you.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <PillButton href="/creator/pitches" variant="contrast" arrow>
                  See my pitches
                </PillButton>
                <PillButton href="/creator/opportunities" variant="outline">
                  Find more requests
                </PillButton>
              </div>
            </Block>
          ) : null}

          {/* Pitch */}
          <Block tone="paper" pad="md" id="pitch" className="scroll-mt-24">
            {showComposer ? (
              <PitchComposer
                key={editing ? `edit-${myPitch?.id}` : "new"}
                request={request}
                business={business}
                product={product}
                creator={creator}
                videos={videos}
                existing={editing ? myPitch : undefined}
                onCancel={editing ? () => setEditing(false) : undefined}
                onDone={(pitchId) => {
                  if (!editing) setSentId(pitchId);
                  setEditing(false);
                  window.requestAnimationFrame(() =>
                    document.getElementById("main")?.scrollIntoView({ behavior: "smooth", block: "start" }),
                  );
                }}
              />
            ) : myPitch ? (
              <MyPitchPanel
                pitch={myPitch}
                request={request}
                business={business}
                onEdit={() => {
                  setSentId(null);
                  setEditing(true);
                }}
              />
            ) : (
              <EmptyState
                headingLevel={2}
                shape="pill"
                tint="coral"
                face="sleepy"
                title={
                  request.status === "hired"
                    ? `${businessName} hired another creator`
                    : "This request is closed"
                }
                body={
                  request.status === "hired"
                    ? "This one's taken, but similar requests come up every week. Your feed is sorted by fit."
                    : `${businessName} stopped taking pitches on this request.`
                }
                action={
                  <PillButton href="/creator/opportunities" variant="contrast" arrow>
                    Browse open requests
                  </PillButton>
                }
              />
            )}
          </Block>
        </div>

        <aside className="hidden lg:col-span-4 lg:block" aria-label="Fit and competition">
          <div className="sticky top-24 flex flex-col gap-2">
            <FitPanel fit={fitResult} />
            <CompetitionBlock request={request} pitches={pitches} business={business} myPitch={myPitch} />
            {showComposer && !editing ? (
              <Block tone="paper" pad="md" className="flex flex-col gap-3">
                <p className="y-small y-fg-2">
                  A good pitch takes about 5 minutes. Use a template, then make it yours.
                </p>
                <PillButton href="#pitch" variant="contrast" icon={<PenLine size={16} aria-hidden />}>
                  Write your pitch
                </PillButton>
              </Block>
            ) : !isOpen && !myPitch ? (
              <Block tone="paper" pad="md" className="flex items-center gap-3">
                <Lock size={18} aria-hidden />
                <p className="y-small">No longer taking pitches</p>
              </Block>
            ) : null}
          </div>
        </aside>
      </div>
    </Page>
  );
}
