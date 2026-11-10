"use client";

import { ArrowLeft, Eye, EyeOff, Lock, MailOpen, PenLine } from "lucide-react";
import { useState } from "react";

import { CreatorSetupSheet } from "@/components/account/creator-setup-sheet";
import { MyPitchPanel } from "@/components/creator/my-pitch-panel";
import { BusinessRow, FitAside, ProductDetails } from "@/components/creator/opportunity-blocks";
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
import { useToast } from "@/components/ui/toast";
import { dueLabel, lengthLabel, moneyRange, netRange, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import {
  businessById,
  fit,
  isAdCopy,
  me,
  myPitchFor,
  pitchesForRequest,
  portfolio,
  productById,
} from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { ContentRequest } from "@/lib/types";

function BackLink() {
  return (
    <div className="mb-2 flex items-center gap-2">
      <PillButton
        href={paths.findWork()}
        variant="ghost"
        size="sm"
        icon={<ArrowLeft size={18} aria-hidden className="y-flip" />}
      >
        Find work
      </PillButton>
    </div>
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
            <PillButton href={paths.findWork()} variant="contrast" arrow>
              Browse open orders
            </PillButton>
          }
        />
      </Block>
    </Page>
  );
}

const scrollTo = (id: string) =>
  window.requestAnimationFrame(() =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }),
  );

/**
 * Someone else's custom order, as anyone other than its owner sees it: the brief, how well they
 * fit, and their pitch (write, edit, or follow it). Accounts without a creator profile set one up
 * first, then carry on to the composer. The owner never gets here (the order page shows them the
 * pitches instead), so nobody can pitch on their own request.
 */
export function OpportunityView({ request }: { request: ContentRequest }) {
  const s = useDemo();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);

  const creator = me.creator(s);
  const myPitch = creator ? myPitchFor(s, request.id, creator.id) : undefined;
  const invited = creator ? request.invitedCreatorIds.includes(creator.id) : false;
  const hidden = me.hiddenRequestIds(s).includes(request.id);

  if (request.kind === "campaign") {
    // Campaigns have their own page body (slots, not pitches); the order page routes them there.
    return (
      <Unavailable
        title="This order is a UGC campaign"
        body="Campaigns don't take pitches: creators who fit pick a slot. Open it from Find work to see the details."
      />
    );
  }
  if (request.status === "draft") {
    return (
      <Unavailable
        title="This order isn't published yet"
        body="The business is still writing it. It shows up in Find work once it's open for pitches."
      />
    );
  }
  if (request.visibility === "invite" && !invited && !myPitch) {
    return (
      <Unavailable
        title="This order is invite-only"
        body="The business picked a few creators to pitch on it. Keep your profile sharp so you get the next invite."
      />
    );
  }

  const business = businessById(s, request.businessId);
  const product = productById(s, request.brief.productId);
  const fitResult = creator ? fit(s, creator, request) : undefined;
  const pitches = pitchesForRequest(s, request.id);
  const videos = creator ? portfolio(s, creator) : [];
  const due = dueLabel(request.dueDate);
  const isOpen = request.status === "open";
  const justSent = sentId !== null && myPitch?.id === sentId;
  const showComposer = Boolean(creator) && isOpen && (!myPitch || editing);
  const businessName = business?.name ?? "The business";

  const hide = () => {
    actions.hideRequest(request.id);
    toast({
      message: "Hidden from your feed and Find work.",
      action: { label: "Undo", onClick: () => actions.unhideRequest(request.id) },
    });
  };
  const unhide = () => {
    actions.unhideRequest(request.id);
    toast({ message: "Back in your feed." });
  };

  const fitAction =
    isOpen && !myPitch && !editing ? (
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
            <div className="flex flex-wrap items-center gap-1.5">
              {invited ? (
                <Badge tone="ink" icon={<MailOpen size={14} aria-hidden />}>
                  {businessName} invited you
                </Badge>
              ) : null}
              {!isOpen && !myPitch ? <RequestBadge status={request.status} /> : null}
              {myPitch ? <PitchBadge status={myPitch.status} /> : null}
              {!myPitch ? (
                hidden ? (
                  <PillButton
                    size="sm"
                    variant="ghost"
                    className="ms-auto -me-3"
                    icon={<Eye size={16} aria-hidden />}
                    onClick={unhide}
                  >
                    Hidden · Show again
                  </PillButton>
                ) : (
                  <PillButton
                    size="sm"
                    variant="ghost"
                    className="ms-auto -me-3"
                    icon={<EyeOff size={16} aria-hidden />}
                    onClick={hide}
                  >
                    Not interested
                  </PillButton>
                )
              ) : null}
            </div>
            <div className="flex flex-col gap-3">
              <h1 className="y-display y-t-display max-w-[24ch]">{request.title}</h1>
              <p className="y-body y-fg-2">
                <span className="y-num font-semibold text-(--b-fg)">
                  {moneyRange(request.budget.min, request.budget.max)}
                </span>
                <span className="y-num"> · you earn {netRange(request.budget.min, request.budget.max)}</span>
                {" · "}
                <span className={due.urgency === "late" ? "text-(--y-danger)" : ""}>{due.text}</span>
                {" · "}
                {isAdCopy(request)
                  ? "Ad copy writing"
                  : `${plural(request.brief.videoCount, "video")} · ${lengthLabel(request.brief.durationSec)}`}
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
            <h2 className="y-head">The brief</h2>
            <BriefSummary brief={request.brief} product={product} />
            {product ? <ProductDetails product={product} /> : null}
          </Block>

          {/* Success */}
          {justSent && !editing ? (
            <Block tone="paper" pad="lg" className="y-enter flex flex-col items-center gap-4 text-center">
              <Celebrate className="h-32 w-52" />
              <div className="flex flex-col gap-2" role="status">
                <h2 className="y-display y-title">
                  Pitch sent. {businessName} usually replies {replyWindow(business)}.
                </h2>
                <p className="y-body y-fg-2 mx-auto max-w-[52ch]">
                  We&apos;ll tell you when they open it. You can edit or withdraw your pitch until they
                  shortlist you.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <PillButton href={paths.pitches} variant="contrast" arrow>
                  See my pitches
                </PillButton>
                <PillButton href={paths.findWork()} variant="outline">
                  Find more orders
                </PillButton>
              </div>
            </Block>
          ) : null}

          {/* Pitch */}
          <Block tone="paper" pad="md" id="pitch" className="scroll-mt-24">
            {!creator && isOpen ? (
              <EmptyState
                headingLevel={2}
                shape="bean"
                tint="mint"
                face="smile"
                title="Set up your creator profile to pitch"
                body="It takes a minute: your name, the languages you speak and what you make. Then you're straight back here to write your pitch."
                action={
                  <PillButton variant="contrast" arrow onClick={() => setSetupOpen(true)}>
                    Set up and pitch
                  </PillButton>
                }
              />
            ) : showComposer && creator ? (
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
                  scrollTo("main");
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
                    : "This order is closed"
                }
                body={
                  request.status === "hired"
                    ? "This one's taken, but similar orders come up every week. Find work puts the best fit first."
                    : `${businessName} stopped taking pitches on this order.`
                }
                action={
                  <PillButton href={paths.findWork()} variant="contrast" arrow>
                    Browse open orders
                  </PillButton>
                }
              />
            )}
          </Block>
        </div>

        <aside className="hidden lg:col-span-4 lg:block" aria-label={creator ? "Your fit" : "Pitches"}>
          <div className="sticky top-24">{fitAside}</div>
        </aside>
      </div>

      {setupOpen ? (
        <CreatorSetupSheet
          open
          reason="to pitch on this order"
          onClose={() => setSetupOpen(false)}
          onDone={() => {
            setSetupOpen(false);
            scrollTo("pitch");
          }}
        />
      ) : null}
    </Page>
  );
}
