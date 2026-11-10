"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Block } from "@/components/ui/block";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { BackPill, WidePage } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { StickyActionBar } from "@/components/ui/sticky-bar";
import { paths } from "@/lib/paths";
import {
  brandHandleFor,
  businessById,
  commissionById,
  commissionTotals,
  creatorById,
  isAdCopy,
  latestDelivery,
  productById,
  requestById,
  sideOf,
  slotPlatform,
  unreadComments,
} from "@/lib/selectors";
import { actions, type DemoState, useDemo, useHydrated } from "@/lib/store";
import { campaignPlatformById } from "@/lib/taxonomy";
import type { Commission, Role } from "@/lib/types";

import { unreadIds } from "./comments-panel";
import { Deliveries, type DeliveriesRequest } from "./deliveries";
import { type Confirmation, scrollMotion, type SheetName, type SlotContext, TAB_IDS, type TabId, type Workspace } from "./helpers";
import { useNextStep } from "./next-step";
import { OrderHeader } from "./order-header";
import { WorkspaceSheets } from "./sheets";
import { SidePanels } from "./side-panels";
import { WorkspaceTabs } from "./workspace-tabs";

/**
 * The order page at /work/[id] (Work spec 6.8), the same page for the brand and the creator: the
 * side comes from the signed-in account. Main column: the header card (who, what, status, stages,
 * next step), Deliveries (versions, player, comments) and the tabs card (Activity, Messages, Brief,
 * Files). Side column: Details (money) and the person card. Phones: one column, with the stage's
 * main action in a sticky bar. `?version=`, `?comment=` and `?tab=` open a version, highlight a
 * comment, or pick a tab.
 */
export function CommissionWorkspace({ id }: { id: string }) {
  const s = useDemo();
  const hydrated = useHydrated();
  const commission = commissionById(s, id);

  if (!hydrated) return <WorkspaceSkeleton />;
  const side = commission ? sideOf(s, commission) : undefined;
  if (!commission || !side) return <NotFound />;
  return <WorkspaceView key={`${commission.id}-${side}`} commission={commission} side={side} />;
}

function NotFound() {
  return (
    <WidePage>
      <BackPill href={paths.work()} label="Work" />
      <Block tone="paper" pad="lg">
        <EmptyState
          headingLevel={2}
          title="We couldn't find that order"
          body="It may belong to another account, or the link is out of date. Everything you ordered or are making is in Work."
        />
      </Block>
    </WidePage>
  );
}

function WorkspaceSkeleton() {
  return (
    <WidePage>
      <div aria-busy="true" aria-label="Loading order" className="flex flex-col">
        <Skeleton className="mb-[18px] h-9 w-24 !rounded-full" />
        <div className="y-ord-grid">
          <div className="y-ord-main">
            <div data-tone="paper" className="y-block y-ord-card y-ord-head flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-11 !rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-12 w-4/5" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div data-tone="paper" className="y-block y-ord-card y-ord-body flex flex-col gap-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-72 w-full" />
            </div>
          </div>
          <div className="y-ord-side">
            <div data-tone="paper" className="y-block y-ord-card y-ord-body flex flex-col gap-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    </WidePage>
  );
}

const isTab = (value: string | null): value is TabId => Boolean(value) && TAB_IDS.includes(value as TabId);

function WorkspaceView({ commission, side }: { commission: Commission; side: Role }) {
  const s = useDemo();
  const params = useSearchParams();
  const creator = creatorById(s, commission.creatorId);
  const business = businessById(s, commission.businessId);
  const product = productById(s, commission.brief.productId);
  const latest = latestDelivery(commission);
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [sheetKey, setSheetKey] = useState(0);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [tab, setTab] = useState<TabId>(() => (isTab(params.get("tab")) ? (params.get("tab") as TabId) : "activity"));
  const [request, setRequest] = useState<DeliveriesRequest | undefined>();
  const tabsRef = useRef<HTMLElement>(null);
  const deliveriesRef = useRef<HTMLElement>(null);

  // The URL can open a version, highlight a comment or pick a tab (links from Messages, Alerts,
  // Work). Applied while rendering when the query changes; the scroll happens in the effect below.
  const query = params.toString();
  const [seenQuery, setSeenQuery] = useState<string | null>(null);
  const [scrollTo, setScrollTo] = useState<{ target: "deliveries" | "tabs"; key: number } | null>(null);
  if (query !== seenQuery) {
    setSeenQuery(query);
    const version = Number(params.get("version"));
    const comment = params.get("comment") ?? undefined;
    const delivery = version ? commission.deliveries.find((d) => d.version === version) : undefined;
    if (delivery || comment) {
      setRequest({ deliveryId: delivery?.id, commentId: comment, key: (request?.key ?? 0) + 1 });
      setScrollTo({ target: "deliveries", key: (scrollTo?.key ?? 0) + 1 });
    }
    const wanted = params.get("tab");
    if (seenQuery !== null && isTab(wanted)) {
      setTab(wanted);
      setScrollTo({ target: "tabs", key: (scrollTo?.key ?? 0) + 1 });
    }
  }
  useEffect(() => {
    if (!scrollTo) return;
    const node = scrollTo.target === "deliveries" ? deliveriesRef.current : tabsRef.current;
    window.requestAnimationFrame(() => node?.scrollIntoView({ behavior: scrollMotion(), block: "start" }));
  }, [scrollTo]);

  // What was new to this side when the order opened (and anything that arrives while it's open):
  // kept for the visit so the "New" marks and version dots survive marking everything read.
  const unreadNow = unreadIds(commission.deliveries, side);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set(unreadNow));
  if (unreadNow.some((id) => !fresh.has(id))) setFresh(new Set([...fresh, ...unreadNow]));

  // Opening the order clears this side's unread comments and replies (the badges in Work).
  const unread = unreadComments(commission, side);
  useEffect(() => {
    if (unread > 0) actions.markCommentsRead(commission.id);
  }, [commission.id, unread]);

  const openSheet = useCallback((name: SheetName) => {
    setSheetKey((key) => key + 1);
    setSheet(name);
  }, []);

  const showTab = useCallback((next: TabId) => {
    setTab(next);
    window.requestAnimationFrame(() => tabsRef.current?.scrollIntoView({ behavior: scrollMotion(), block: "start" }));
  }, []);

  const goToMessages = useCallback(() => {
    setTab("messages");
    window.setTimeout(() => {
      tabsRef.current?.scrollIntoView({ behavior: scrollMotion(), block: "start" });
      tabsRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus({ preventScroll: true });
    }, 60);
  }, []);

  const showDeliveries = useCallback((deliveryId?: string) => {
    if (deliveryId) setRequest((current) => ({ deliveryId, key: (current?.key ?? 0) + 1 }));
    window.requestAnimationFrame(() => deliveriesRef.current?.scrollIntoView({ behavior: scrollMotion(), block: "start" }));
  }, []);

  const creatorName = creator?.firstName ?? "the creator";
  const businessName = business?.name ?? "the brand";
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
    adCopy: isAdCopy(commission),
    openSheet,
    confirm: setConfirmation,
    goToMessages,
    showTab,
    showDeliveries,
  };
  const step = useNextStep(ws);

  // An offer, or an order that ended before anything was delivered, has no Deliveries card.
  const showDeliveriesCard =
    commission.deliveries.length > 0 ||
    (commission.status !== "offered" && commission.status !== "cancelled" && commission.status !== "declined");

  // The ordering side manages a campaign from its order page; everyone else goes back to Work.
  const back =
    slot && side === "business" && commission.requestId
      ? { href: paths.order(commission.requestId), label: "Campaign" }
      : { href: paths.work(side === "business" ? "ordered" : "making"), label: "Work" };

  return (
    <WidePage className={step.bar ? "y-ord-has-bar" : ""}>
      <BackPill href={back.href} label={back.label} />
      <div className="y-ord-grid">
        <div className="y-ord-main">
          <OrderHeader ws={ws} step={step} />
          {showDeliveriesCard ? <Deliveries ws={ws} request={request} fresh={fresh} sectionRef={deliveriesRef} /> : null}
          <WorkspaceTabs ws={ws} tab={tab} onTab={setTab} sectionRef={tabsRef} />
        </div>
        <aside className="y-ord-side" aria-label="Details">
          <SidePanels ws={ws} />
        </aside>
      </div>

      {step.bar ? <StickyActionBar label="Next step">{step.bar}</StickyActionBar> : null}

      <WorkspaceSheets ws={ws} sheet={sheet} sheetKey={sheetKey} onClose={() => setSheet(null)} />
      <ConfirmModal
        open={Boolean(confirmation)}
        onClose={() => setConfirmation(null)}
        title={confirmation?.title ?? ""}
        primary={{
          label: confirmation?.primary?.label ?? "Done",
          onClick: () => {
            confirmation?.primary?.onClick?.();
            setConfirmation(null);
          },
        }}
        link={
          confirmation?.link
            ? {
                label: confirmation.link.label,
                href: confirmation.link.href,
                onClick: () => {
                  confirmation.link?.onClick?.();
                  setConfirmation(null);
                },
              }
            : undefined
        }
      >
        {confirmation?.body}
      </ConfirmModal>
    </WidePage>
  );
}

function slotContext(s: DemoState, commission: Commission): SlotContext {
  const request = commission.requestId ? requestById(s, commission.requestId) : undefined;
  const terms = request?.campaign;
  // The one platform this creator posts on (chosen when they picked the slot).
  const platformId = slotPlatform(commission, request);
  const platform = terms ? campaignPlatformById[platformId] : undefined;
  const creator = creatorById(s, commission.creatorId);
  return {
    request,
    terms,
    platform: platformId,
    platformName: platform?.name ?? "the campaign's platform",
    disclosure: platform?.disclosure ?? "Paid partnership label",
    brandHandle: terms ? brandHandleFor(terms, platformId) : "the brand account",
    social: terms ? creator?.socials?.find((a) => a.platform === platformId) : undefined,
  };
}
