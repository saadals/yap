"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { StageTrack } from "@/components/domain/stage-track";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { paths } from "@/lib/paths";
import {
  businessById,
  commissionById,
  commissionTotals,
  creatorById,
  latestDelivery,
  productById,
  requestById,
  sideOf,
} from "@/lib/selectors";
import { type DemoState, useDemo, useHydrated } from "@/lib/store";
import { campaignPlatformById, formatById } from "@/lib/taxonomy";
import type { Commission, Role } from "@/lib/types";

import { type SheetName, type SlotContext, type TabId, type Workspace } from "./helpers";
import { NextStep } from "./next-step";
import { ReviewArea } from "./review-area";
import { WorkspaceSheets } from "./sheets";
import { SidePanels } from "./side-panels";
import { WorkspaceTabs } from "./workspace-tabs";

/**
 * The commission workspace at /work/[id], for whoever is looking: the side (ordering or making)
 * comes from the signed-in account. One header (who, what, progress and the next step), the
 * review area for deliveries, then messages/brief/activity/files. One slim Details block sits on
 * the side. Campaign slots get their own steps: watermarked review copies, approve / ask for
 * changes / reject, and the creator's post.
 */
export function CommissionWorkspace({ id }: { id: string }) {
  const s = useDemo();
  const hydrated = useHydrated();
  const commission = commissionById(s, id);

  if (!hydrated) return <WorkspaceSkeleton />;
  const side = commission ? sideOf(s, commission) : undefined;
  if (!commission || !side) return <NotFound />;
  return <WorkspaceView key={commission.id} commission={commission} side={side} />;
}

function NotFound() {
  return (
    <Page>
      <Block tone="paper" pad="lg" className="mt-2">
        <EmptyState
          headingLevel={2}
          shape="dome"
          tint="violet"
          face="sleepy"
          title="We couldn't find that commission"
          body="It may belong to another account, or the link is out of date. Everything you ordered or are making is in Work."
          action={
            <PillButton href={paths.work()} variant="contrast" arrow>
              Go to Work
            </PillButton>
          }
        />
      </Block>
    </Page>
  );
}

function WorkspaceSkeleton() {
  return (
    <Page>
      <div aria-busy="true" aria-label="Loading commission" className="flex flex-col gap-2">
        <Skeleton className="mb-3 h-6 w-36" />
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
          <div className="flex flex-col gap-2 lg:col-span-8">
            <div data-tone="paper" className="y-block y-pad-lg flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-11 !rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-12 w-4/5" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-8 w-24" />
              </div>
              <Skeleton className="h-14 w-full" />
            </div>
            <div data-tone="paper" className="y-block y-pad-md flex flex-col gap-3">
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-12 w-48" />
            </div>
          </div>
          <div className="flex flex-col gap-2 lg:col-span-4">
            <div data-tone="paper" className="y-block y-pad-md flex flex-col gap-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}

function WorkspaceView({ commission, side }: { commission: Commission; side: Role }) {
  const s = useDemo();
  const creator = creatorById(s, commission.creatorId);
  const business = businessById(s, commission.businessId);
  const product = productById(s, commission.brief.productId);
  const latest = latestDelivery(commission);
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [sheetKey, setSheetKey] = useState(0);
  // A new offer, or a campaign slot still to film, opens on the brief (what to make).
  const [tab, setTab] = useState<TabId>(
    side === "creator" &&
      (commission.status === "offered" || (commission.source === "campaign" && commission.status === "in_progress"))
      ? "brief"
      : "messages",
  );
  const tabsRef = useRef<HTMLElement>(null);

  const openSheet = useCallback((name: SheetName) => {
    setSheetKey((key) => key + 1);
    setSheet(name);
  }, []);

  const showTab = useCallback((next: TabId) => {
    setTab(next);
    window.requestAnimationFrame(() =>
      tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }, []);

  const goToMessages = useCallback(() => {
    setTab("messages");
    window.setTimeout(() => {
      tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      tabsRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus({ preventScroll: true });
    }, 60);
  }, []);

  const hasDeliveries = commission.deliveries.length > 0;
  const creatorName = creator?.firstName ?? "the creator";
  const businessName = business?.name ?? "the client";
  const slot = commission.source === "campaign" ? slotContext(s, commission) : undefined;
  const ws: Workspace = {
    commission,
    side,
    creator,
    business,
    product,
    totals: commissionTotals(commission),
    creatorName,
    businessName,
    otherName: side === "business" ? creatorName : businessName,
    latest,
    slot,
    openSheet,
    goToMessages,
    showTab,
  };

  // The ordering side manages a campaign from its order page; everyone else goes back to Work.
  const back =
    slot && side === "business" && commission.requestId
      ? { href: paths.order(commission.requestId), label: "Back to campaign" }
      : { href: paths.work(side === "business" ? "ordered" : "making"), label: "Work" };

  return (
    <Page>
      <Link
        href={back.href}
        className="y-small y-fg-2 ms-0 mb-2 inline-flex w-fit items-center gap-1.5 rounded-full px-1 py-2 font-medium hover:text-(--y-ink) md:mb-3"
      >
        <ArrowLeft size={16} aria-hidden className="y-flip" />
        {back.label}
      </Link>

      {/* Mobile order: header, review, details, tabs. On desktop, details sit in the side column. */}
      <div className="grid grid-cols-1 items-start gap-2 lg:grid-cols-12 [&>*]:min-w-0">
        <div className="lg:col-span-8">
          <Header ws={ws} />
        </div>
        {hasDeliveries ? (
          <div className="lg:col-span-8">
            <ReviewArea ws={ws} />
          </div>
        ) : null}
        <aside
          aria-labelledby="details-title"
          className={`lg:col-span-4 lg:col-start-9 lg:row-start-1 ${hasDeliveries ? "lg:row-span-3" : "lg:row-span-2"}`}
        >
          <SidePanels ws={ws} />
        </aside>
        <div className="lg:col-span-8">
          <WorkspaceTabs ws={ws} tab={tab} onTab={setTab} sectionRef={tabsRef} />
        </div>
      </div>

      <WorkspaceSheets ws={ws} sheet={sheet} sheetKey={sheetKey} onClose={() => setSheet(null)} />
    </Page>
  );
}

function slotContext(s: DemoState, commission: Commission): SlotContext {
  const request = commission.requestId ? requestById(s, commission.requestId) : undefined;
  const terms = request?.campaign;
  const platform = terms ? campaignPlatformById[terms.platform] : undefined;
  const creator = creatorById(s, commission.creatorId);
  return {
    request,
    terms,
    platformName: platform?.name ?? "the campaign's platform",
    disclosure: platform?.disclosure ?? "Paid partnership label",
    brandHandle: terms?.brandHandle ?? "the brand account",
    social: terms ? creator?.socials?.find((a) => a.platform === terms.platform) : undefined,
  };
}

function Header({ ws }: { ws: Workspace }) {
  const { commission, slot } = ws;
  // Progress only while work is moving; offers, endings and payouts are said by the next step.
  // A campaign slot keeps moving after approval until the post is live.
  const moving =
    ["in_progress", "revision", "delivered", "disputed"].includes(commission.status) ||
    (Boolean(slot) && commission.status === "completed" && commission.post?.status !== "live");

  return (
    <Block as="header" tone="paper" pad="lg" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <WhoLine ws={ws} />
        <h1 className="y-display y-t-display max-w-[22ch] lg:!text-[52px]">{commission.title}</h1>
      </div>
      {moving ? (
        <StageTrack status={commission.status} campaign={slot ? { post: commission.post } : undefined} />
      ) : null}
      <div className="border-t border-(--b-line) pt-6">
        <NextStep ws={ws} />
      </div>
    </Block>
  );
}

/** "(avatar) Layla Mansour · App demo · Repeat of “…”": who it's with, the format and where it came from. */
function WhoLine({ ws }: { ws: Workspace }) {
  const s = useDemo();
  const { commission, side, creator, business, slot } = ws;
  const request = commission.requestId ? requestById(s, commission.requestId) : undefined;
  const previous = commission.previousCommissionId
    ? commissionById(s, commission.previousCommissionId)
    : undefined;

  const source = slot ? (
    commission.requestId ? (
      <Link href={paths.order(commission.requestId)} className="y-link">
        Slot {commission.campaignSlot ?? ""}
        <span className="max-sm:hidden"> of {request ? `“${request.title}”` : "the campaign"}</span>
      </Link>
    ) : (
      `Slot ${commission.campaignSlot ?? ""}`
    )
  ) : commission.previousCommissionId ? (
    <Link href={paths.commission(commission.previousCommissionId)} className="y-link">
      Repeat<span className="max-sm:hidden"> of {previous ? `“${previous.title}”` : "an earlier commission"}</span>
    </Link>
  ) : commission.source === "request" && commission.requestId ? (
    <Link href={paths.order(commission.requestId)} className="y-link">
      From request{request ? <span className="max-sm:hidden"> “{request.title}”</span> : null}
    </Link>
  ) : (
    "Direct offer"
  );

  return (
    <div className="flex items-center gap-3">
      {side === "business" && creator ? <FaceAvatar id={creator.id} name="" size={36} /> : null}
      {side === "creator" && business ? <BusinessLogo business={business} size={36} /> : null}
      <p className="y-small y-fg-2 min-w-0">
        {side === "business" && creator ? (
          <Link href={paths.creator(creator.handle)} className="font-semibold text-(--b-fg) hover:underline">
            {creator.name}
          </Link>
        ) : (
          <span className="font-semibold text-(--b-fg)">{ws.businessName}</span>
        )}
        {" · "}
        {slot ? "UGC campaign" : formatById[commission.brief.format]?.name}
        {" · "}
        {source}
      </p>
    </div>
  );
}
