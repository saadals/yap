/**
 * Everything a buyer profile ordered, as one list of items: jobs (commissions you placed, campaign
 * slots left out), UGC campaigns, custom orders taking pitches, and drafts. Both Home ("In
 * progress") and /orders read these. Pure: safe in render.
 *
 * Stages (the /orders tabs):
 * - progress: jobs being made or reviewed, running campaigns
 * - open: custom orders taking pitches, drafts
 * - done: finished, cancelled or declined jobs, closed campaigns and requests
 *
 * A custom order that hired someone is represented by its job, so it doesn't get a row of its own.
 */
import { unreadPitches } from "@/lib/attention";
import { daysFromNow } from "@/lib/format";
import { paths } from "@/lib/paths";
import {
  campaignProgress,
  commissionsForBusiness,
  creatorById,
  isActive,
  isCampaign,
  me,
  pitchesForRequest,
  productById,
  requestsForBusiness,
} from "@/lib/selectors";
import type { DemoState, OrderDraft } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";
import type { Commission, ContentRequest, Creator } from "@/lib/types";

export type OrderStage = "progress" | "open" | "done";

type Base = { key: string; stage: OrderStage; needsYou: boolean; title: string };

export type JobItem = Base & { kind: "job"; commission: Commission; creator?: Creator };
export type CampaignItem = Base & {
  kind: "campaign";
  request: ContentRequest;
  progress: ReturnType<typeof campaignProgress>;
};
export type RequestItem = Base & { kind: "request"; request: ContentRequest; pitches: number; unread: number };
/** A draft: a seeded request saved as `status: "draft"`, or the new-order form's saved draft (one per kind). */
export type DraftItem = Base & { kind: "draft"; request?: ContentRequest; autosave?: OrderDraft };

export type OrderItem = JobItem | CampaignItem | RequestItem | DraftItem;

const time = (iso: string | undefined) => (iso ? Date.parse(iso) : 0);

/** Every order of the signed-in account's buyer profile, unsorted. */
export function orderItems(s: DemoState): OrderItem[] {
  const items: OrderItem[] = [];
  const jobs = commissionsForBusiness(s);

  for (const commission of jobs) {
    items.push({
      kind: "job",
      key: commission.id,
      title: commission.title,
      commission,
      creator: creatorById(s, commission.creatorId),
      stage: isActive(commission) ? "progress" : "done",
      needsYou: commission.status === "delivered",
    });
  }

  for (const request of requestsForBusiness(s)) {
    if (request.status === "draft") {
      items.push({ kind: "draft", key: request.id, title: request.title, request, stage: "open", needsYou: false });
      continue;
    }
    if (isCampaign(request)) {
      const progress = campaignProgress(s, request);
      items.push({
        kind: "campaign",
        key: request.id,
        title: request.title,
        request,
        progress,
        stage: request.status === "closed" ? "done" : "progress",
        needsYou: request.status !== "closed" && progress.review > 0,
      });
      continue;
    }
    // A hired custom order lives on as its job.
    if (request.status === "hired" && jobs.some((c) => c.requestId === request.id)) continue;
    const unread = request.status === "open" ? unreadPitches(s, request.id).length : 0;
    items.push({
      kind: "request",
      key: request.id,
      title: request.title,
      request,
      pitches: pitchesForRequest(s, request.id).length,
      unread,
      stage: request.status === "open" ? "open" : "done",
      needsYou: unread > 0,
    });
  }

  // The new-order form's saved drafts: one per kind ("custom", "campaign"), never posted.
  for (const autosave of me.orderDrafts(s)) {
    items.push({
      kind: "draft",
      key: `autosave-${autosave.kind}`,
      title: autosave.title?.trim() || (autosave.kind === "campaign" ? "Unfinished UGC campaign" : "Unfinished custom order"),
      autosave,
      stage: "open",
      needsYou: false,
    });
  }
  return items;
}

/** Where a row goes. */
export function itemHref(item: OrderItem): string {
  switch (item.kind) {
    case "job":
      return paths.job(item.commission.id);
    case "campaign":
    case "request":
      return paths.order(item.request.id);
    case "draft":
      if (item.autosave) return paths.newOrder({ type: item.autosave.kind });
      return isCampaign(item.request) ? paths.order(item.request!.id) : paths.newOrder({ draft: item.request!.id });
  }
}

/** When the item last mattered: due date for work in flight, the finish date for done work. */
function sortTime(item: OrderItem): number {
  switch (item.kind) {
    case "job":
      return item.stage === "done"
        ? time(item.commission.completedAt ?? item.commission.createdAt)
        : time(item.commission.dueDate);
    case "campaign":
    case "request":
      return time(item.request.postedAt);
    case "draft":
      return time(item.request?.postedAt ?? item.autosave?.savedAt);
  }
}

const kindOrder: Record<OrderItem["kind"], number> = { job: 0, campaign: 1, request: 2, draft: 3 };
const stageOrder: Record<OrderStage, number> = { progress: 0, open: 1, done: 2 };

/**
 * Sorted for a list: what needs you first, then by stage (in progress, open, done); within a stage
 * jobs by due date (soonest first), campaigns and requests newest first, drafts last. Done work is
 * newest first.
 */
export function sortItems(items: OrderItem[]): OrderItem[] {
  return [...items].sort((a, b) => {
    const needs = Number(b.needsYou) - Number(a.needsYou);
    if (needs) return needs;
    const stage = stageOrder[a.stage] - stageOrder[b.stage];
    if (stage) return stage;
    if (a.stage === "done") return sortTime(b) - sortTime(a);
    const kind = kindOrder[a.kind] - kindOrder[b.kind];
    if (kind) return kind;
    return a.kind === "job" ? sortTime(a) - sortTime(b) : sortTime(b) - sortTime(a);
  });
}

/** Words a search can match: title, creator, product, format (ad copy: "Ad copy writing"), kind. */
export function searchText(s: DemoState, item: OrderItem): string {
  const parts: (string | undefined)[] = [item.title];
  const brief =
    item.kind === "job"
      ? item.commission.brief
      : item.kind === "draft"
        ? item.request?.brief
        : item.request.brief;
  if (brief?.productId) parts.push(productById(s, brief.productId)?.name);
  if (brief?.format) parts.push(formatById[brief.format]?.name);
  if (item.kind === "job") parts.push(item.creator?.name, item.creator?.handle);
  if (item.kind === "campaign") {
    parts.push("ugc campaign");
    // Creators on the campaign's slots.
    for (const c of s.commissions)
      if (c.requestId === item.request.id && c.source === "campaign") parts.push(creatorById(s, c.creatorId)?.name);
  }
  if (item.kind === "request") parts.push("pitches custom order");
  if (item.kind === "draft")
    parts.push("draft", (item.autosave?.kind ?? (isCampaign(item.request) ? "campaign" : "custom")) === "campaign" ? "ugc campaign" : "custom order");
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function matchesQuery(s: DemoState, item: OrderItem, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = searchText(s, item);
  return words.every((word) => text.includes(word));
}

/** Pitches that arrived today or yesterday (demo clock). */
export const recentPitchCount = (s: DemoState, requestId: string) =>
  pitchesForRequest(s, requestId).filter((p) => p.status !== "declined" && -daysFromNow(p.sentAt) <= 1).length;
