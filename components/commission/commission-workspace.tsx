"use client";

import { ArrowLeft, BadgeCheck, FileText, Repeat2, Send } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { FormatChip } from "@/components/domain/chips";
import { BusinessLogo } from "@/components/domain/business-logo";
import { StageTrack } from "@/components/domain/stage-track";
import { CommissionBadge, DueBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { dueLabel } from "@/lib/format";
import {
  businessById,
  commissionById,
  commissionTotals,
  creatorById,
  latestDelivery,
  productById,
  requestById,
} from "@/lib/selectors";
import { ME, useDemo, useHydrated } from "@/lib/store";
import type { Commission, Role } from "@/lib/types";

import { type SheetName, type TabId, type Workspace } from "./helpers";
import { NextStep } from "./next-step";
import { ReviewArea } from "./review-area";
import { WorkspaceSheets } from "./sheets";
import { SidePanels } from "./side-panels";
import { WorkspaceTabs } from "./workspace-tabs";

/**
 * The commission workspace, shared by /business/commissions/[id] and /creator/commissions/[id]:
 * status and next step, the review area for deliveries, messages/brief/activity/files, and the
 * people, money, dates and help on the side.
 */
export function CommissionWorkspace({ id, role }: { id: string; role: Role }) {
  const s = useDemo();
  const hydrated = useHydrated();
  const commission = commissionById(s, id);

  if (!hydrated) return <WorkspaceSkeleton />;
  const visible =
    commission &&
    (role === "business" ? commission.businessId === ME.businessId : commission.creatorId === ME.creatorId);
  if (!commission || !visible) return <NotFound role={role} />;
  return <WorkspaceView key={commission.id} commission={commission} role={role} />;
}

function NotFound({ role }: { role: Role }) {
  return (
    <Page>
      <Block tone="paper" pad="lg" className="mt-2">
        <EmptyState
          headingLevel={2}
          shape="dome"
          tint="violet"
          face="sleepy"
          title="We couldn't find that commission"
          body={
            role === "business"
              ? "It may belong to another team, or the link is out of date. Your commissions are all in one list."
              : "It may belong to another creator, or the link is out of date. Your client work is all in one list."
          }
          action={
            <PillButton href={`/${role}/commissions`} variant="contrast" arrow>
              Go to your commissions
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
              <Skeleton className="h-12 w-full" />
            </div>
            <div data-tone="paper" className="y-block y-pad-md flex flex-col gap-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}

function WorkspaceView({ commission, role }: { commission: Commission; role: Role }) {
  const s = useDemo();
  const creator = creatorById(s, commission.creatorId);
  const business = businessById(s, commission.businessId);
  const product = productById(s, commission.brief.productId);
  const latest = latestDelivery(commission);
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [sheetKey, setSheetKey] = useState(0);
  const [tab, setTab] = useState<TabId>(
    role === "creator" && commission.status === "offered" ? "brief" : "messages",
  );
  const reviewRef = useRef<HTMLElement>(null);
  const tabsRef = useRef<HTMLElement>(null);

  const openSheet = useCallback((name: SheetName) => {
    setSheetKey((key) => key + 1);
    setSheet(name);
  }, []);

  const goToReview = useCallback(() => {
    const node = reviewRef.current;
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    node.focus({ preventScroll: true });
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

  const creatorName = creator?.firstName ?? "the creator";
  const businessName = business?.name ?? "the client";
  const ws: Workspace = {
    commission,
    role,
    creator,
    business,
    product,
    totals: commissionTotals(commission),
    creatorName,
    businessName,
    otherName: role === "business" ? creatorName : businessName,
    latest,
    openSheet,
    goToReview,
    goToMessages,
    showTab,
  };

  return (
    <Page>
      <Link
        href={`/${role}/commissions`}
        className="y-small y-fg-2 ms-0 mb-2 inline-flex w-fit items-center gap-1.5 rounded-full px-1 py-2 font-medium hover:text-(--y-ink) md:mb-3"
      >
        <ArrowLeft size={16} aria-hidden className="y-flip" />
        All commissions
      </Link>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 [&>*]:min-w-0">
        <div className="flex flex-col gap-2 lg:col-span-8">
          <Header ws={ws} />
          <NextStep ws={ws} />
          {commission.deliveries.length ? <ReviewArea ws={ws} sectionRef={reviewRef} /> : null}
          <WorkspaceTabs ws={ws} tab={tab} onTab={setTab} sectionRef={tabsRef} />
        </div>
        <aside aria-label="Commission details" className="flex flex-col gap-2 lg:col-span-4">
          <SidePanels ws={ws} />
        </aside>
      </div>

      <WorkspaceSheets ws={ws} sheet={sheet} sheetKey={sheetKey} onClose={() => setSheet(null)} />
    </Page>
  );
}

function Header({ ws }: { ws: Workspace }) {
  const s = useDemo();
  const { commission, role, creator, business } = ws;
  const request = commission.requestId ? requestById(s, commission.requestId) : undefined;
  const previous = commission.previousCommissionId
    ? commissionById(s, commission.previousCommissionId)
    : undefined;
  const ended = ["completed", "cancelled", "declined"].includes(commission.status);
  const due = dueLabel(commission.dueDate);

  return (
    <Block as="header" tone="paper" pad="lg" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        {role === "business" && creator ? (
          <Link
            href={`/creators/${creator.handle}`}
            className="group inline-flex items-center gap-3 rounded-full pe-2"
          >
            <FaceAvatar id={creator.id} name="" size={44} />
            <span className="flex flex-col">
              <span className="y-small font-semibold group-hover:underline">{creator.name}</span>
              <span className="y-micro y-fg-2">@{creator.handle} · View profile</span>
            </span>
          </Link>
        ) : null}
        {role === "creator" && business ? (
          <span className="inline-flex items-center gap-3">
            <BusinessLogo business={business} size={44} />
            <span className="flex flex-col">
              <span className="y-small font-semibold">{business.name}</span>
              <span className="y-micro y-fg-2">{business.tagline}</span>
            </span>
            {business.paymentVerified ? (
              <Badge tone="info" icon={<BadgeCheck size={14} aria-hidden />}>
                Payment verified
              </Badge>
            ) : null}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <h1 className="y-display y-t-display max-w-[22ch] lg:!text-[52px]">{commission.title}</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <CommissionBadge status={commission.status} />
          {!ended && commission.status !== "offered" && commission.status !== "delivered" ? (
            <DueBadge {...due} />
          ) : null}
          <FormatChip id={commission.brief.format} />
          <Source ws={ws} previousTitle={previous?.title} requestTitle={request?.title} />
        </div>
      </div>

      <div className="border-t border-(--b-line) pt-5">
        <StageTrack status={commission.status} />
      </div>
    </Block>
  );
}

function Source({
  ws,
  previousTitle,
  requestTitle,
}: {
  ws: Workspace;
  previousTitle?: string;
  requestTitle?: string;
}) {
  const { commission, role } = ws;
  if (commission.previousCommissionId) {
    return (
      <Link
        href={`/${role}/commissions/${commission.previousCommissionId}`}
        className="y-chip y-hoverable max-w-full"
      >
        <Repeat2 size={14} aria-hidden className="flex-none" />
        <span className="truncate">Repeat of {previousTitle ? `“${previousTitle}”` : "an earlier commission"}</span>
      </Link>
    );
  }
  if (commission.source === "request" && commission.requestId) {
    return (
      <Link
        href={
          role === "business"
            ? `/business/requests/${commission.requestId}`
            : `/creator/opportunities/${commission.requestId}`
        }
        className="y-chip y-hoverable max-w-full"
      >
        <FileText size={14} aria-hidden className="flex-none" />
        <span className="truncate">From request {requestTitle ? `“${requestTitle}”` : ""}</span>
      </Link>
    );
  }
  return (
    <span className="y-chip">
      <Send size={14} aria-hidden className="y-flip" /> Direct offer
    </span>
  );
}
