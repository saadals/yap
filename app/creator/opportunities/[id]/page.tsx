"use client";

import { ArrowLeft, Lock, MailOpen, PenLine } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { BusinessRow, FitAside, ProductDetails } from "@/components/creator/opportunity-blocks";
import { MyPitchPanel } from "@/components/creator/my-pitch-panel";
import { PitchComposer } from "@/components/creator/pitch-composer";
import { replyWindow } from "@/components/creator/pitch-helpers";
import { BriefSummary } from "@/components/domain/brief-summary";
import { PitchBadge, RequestBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { Celebrate } from "@/components/ui/celebrate";
import { EmptyState } from "@/components/ui/empty-state";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/shell/app-shell";
import { dueLabel, lengthLabel, moneyRange, plural } from "@/lib/format";
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
            <Skeleton className="h-12 w-4/5" />
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-10 w-3/5" />
          </div>
          <div data-tone="paper" className="y-block y-pad-md flex flex-col gap-3">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
        <div className="hidden flex-col gap-2 lg:col-span-4 lg:flex">
          <Skeleton className="h-72 !rounded-(--y-r-block)" />
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
  const due = dueLabel(request.dueDate);
  const isOpen = request.status === "open";
  const justSent = sentId !== null && myPitch?.id === sentId;
  const showComposer = isOpen && (!myPitch || editing);
  const businessName = business?.name ?? "The business";
  const badges = invited || !isOpen || myPitch;

  const fitAction =
    showComposer && !editing ? (
      <PillButton href="#pitch" variant="contrast" icon={<PenLine size={16} aria-hidden />}>
        Write your pitch
      </PillButton>
    ) : !isOpen && !myPitch ? (
      <p className="y-small flex items-center gap-2">
        <Lock size={16} aria-hidden /> No longer taking pitches
      </p>
    ) : null;
  const fitAside = (
    <FitAside fit={fitResult} request={request} pitches={pitches} myPitch={myPitch} action={fitAction} />
  );

  return (
    <Page>
      <BackLink />
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 [&>*]:min-w-0">
        <div className="flex flex-col gap-2 lg:col-span-8">
          {/* Header: title, one meta line, who's asking */}
          <Block tone="paper" pad="lg" className="flex flex-col gap-6">
            {badges ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {invited ? (
                  <Badge tone="ink" icon={<MailOpen size={14} aria-hidden />}>
                    {businessName} invited you
                  </Badge>
                ) : null}
                {!isOpen && !myPitch ? <RequestBadge status={request.status} /> : null}
                {myPitch ? <PitchBadge status={myPitch.status} /> : null}
              </div>
            ) : null}
            <div className="flex flex-col gap-3">
              <h1 className="y-display y-t-display max-w-[24ch]">{request.title}</h1>
              <p className="y-body y-fg-2">
                <span className="y-num font-semibold text-(--b-fg)">
                  {moneyRange(request.budget.min, request.budget.max)}
                </span>
                {" · "}
                <span className={due.urgency === "late" ? "text-(--y-danger)" : ""}>{due.text}</span>
                {" · "}
                {plural(request.brief.videoCount, "video")} · {lengthLabel(request.brief.durationSec)}
              </p>
            </div>
            {business ? (
              <div className="border-t border-(--b-line) pt-5">
                <BusinessRow business={business} request={request} />
              </div>
            ) : null}
          </Block>

          <div className="lg:hidden">{fitAside}</div>

          {/* Brief */}
          <Block tone="paper" pad="md" className="flex flex-col gap-6">
            <h2 className="y-display y-title">The brief</h2>
            <BriefSummary brief={request.brief} product={product} />
            {product ? <ProductDetails product={product} /> : null}
          </Block>

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

        <aside className="hidden lg:col-span-4 lg:block" aria-label="Your fit">
          <div className="sticky top-24">{fitAside}</div>
        </aside>
      </div>
    </Page>
  );
}
