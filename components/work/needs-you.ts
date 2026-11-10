import { addDays } from "@/lib/clock";
import { dueLabel, money, plural, timeAgo, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import {
  businessById,
  campaignAttention,
  campaignSlots,
  commissionTotals,
  commissionsForBusiness,
  commissionsForCreator,
  creatorById,
  latestDelivery,
  me,
  openCampaigns,
  pitchesForCreator,
  pitchesForRequest,
  requestById,
  requestsForBusiness,
} from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";
import type { Commission, Role } from "@/lib/types";

/** The single most useful thing to do right now, across both sides (the Work page's neon). */
export type NeedsYou = {
  /** Which side of a deal it's on: picks the Work tab that opens by default. */
  side: Role;
  /** Short context above the title ("Ready for review", "New offer"). */
  eyebrow: string;
  title: string;
  /** One supporting line. */
  line: string;
  /** Verb for the block's single action. */
  action: string;
  href: string;
  /** False for the "all caught up" suggestion: nothing is actually waiting on you. */
  urgent: boolean;
};

type Candidate = Omit<NeedsYou, "urgent"> & {
  /** 0: someone is waiting on you · 1: your own work to move · 2–3: follow-ups on orders and pitches. */
  tier: number;
  /** Deadline-ish time used to order candidates within a tier (earliest first). */
  at: number;
};

const possessive = (name: string) => (name.endsWith("s") ? `${name}'` : `${name}'s`);

/** timeAgo, lower-cased for mid-sentence use ("yesterday", "3h ago", "Nov 7"). */
export const agoLower = (iso: string) => {
  const ago = timeAgo(iso);
  return ago === "Yesterday" ? "yesterday" : ago;
};

/** Pitches the business hasn't opened yet. */
export const unreadPitches = (s: DemoState, requestId: string) =>
  pitchesForRequest(s, requestId).filter((p) => p.status === "sent");

const autoApproveAt = (c: Commission) =>
  c.autoApproveAt ?? (latestDelivery(c) ? addDays(latestDelivery(c)!.deliveredAt, 3) : c.dueDate);

function orderingCandidates(s: DemoState): Candidate[] {
  const out: Candidate[] = [];

  // A delivery waiting for review: the auto-approve clock is running.
  for (const c of commissionsForBusiness(s).filter((x) => x.status === "delivered")) {
    const who = creatorById(s, c.creatorId)?.firstName ?? "your creator";
    const delivery = latestDelivery(c);
    const auto = autoApproveAt(c);
    out.push({
      side: "business",
      tier: 0,
      at: Date.parse(auto),
      eyebrow: "Ready for review",
      title: `Review ${possessive(who)} ${formatById[c.brief.format].noun[0]}`,
      line: [
        delivery ? `Version ${delivery.version} arrived ${agoLower(delivery.deliveredAt)}.` : "",
        `Auto-approves ${weekdayDate(auto)}.`,
      ]
        .filter(Boolean)
        .join(" "),
      action: "Review",
      href: paths.commission(c.id),
    });
  }

  // Campaign review copies waiting (reviewed from the campaign page).
  for (const { request, progress } of campaignAttention(s)) {
    const waiting = campaignSlots(s, request)
      .map((view) => view.commission)
      .filter((c): c is Commission => c?.status === "delivered");
    const first = waiting.map((c) => Date.parse(autoApproveAt(c))).sort((a, b) => a - b)[0];
    out.push({
      side: "business",
      tier: 0,
      at: first ?? Number.POSITIVE_INFINITY,
      eyebrow: "Campaign",
      title:
        progress.review === 1 ? "A review copy is ready" : `${progress.review} review copies are ready`,
      line: `On “${request.title}”. Each one auto-approves 3 days after upload.`,
      action: progress.review === 1 ? "Review it" : "Review them",
      href: paths.order(request.id),
    });
  }

  const requests = requestsForBusiness(s);
  const open = requests.filter((r) => r.status === "open" && r.kind !== "campaign");

  // Unread pitches on an open request (most unread first).
  const withUnread = open
    .map((request) => ({ request, unread: unreadPitches(s, request.id) }))
    .filter((entry) => entry.unread.length > 0)
    .sort((a, b) => b.unread.length - a.unread.length)[0];
  if (withUnread) {
    out.push({
      side: "business",
      tier: 2,
      at: 0,
      eyebrow: "New pitches",
      title: `Read ${plural(withUnread.unread.length, "waiting pitch", "waiting pitches")}`,
      line: `On “${withUnread.request.title}”.`,
      action: "Read pitches",
      href: paths.order(withUnread.request.id),
    });
  }

  // A shortlisted pitch that needs a decision.
  const shortlisted = open
    .flatMap((request) =>
      pitchesForRequest(s, request.id)
        .filter((p) => p.status === "shortlisted")
        .map((pitch) => ({ pitch, request })),
    )
    .sort((a, b) => Date.parse(a.pitch.sentAt) - Date.parse(b.pitch.sentAt))[0];
  if (shortlisted) {
    const who = creatorById(s, shortlisted.pitch.creatorId)?.firstName ?? "your shortlisted creator";
    out.push({
      side: "business",
      tier: 2,
      at: 1,
      eyebrow: "Shortlist",
      title: `Decide on ${possessive(who)} pitch`,
      line: `${money(shortlisted.pitch.price)} for “${shortlisted.request.title}”.`,
      action: "Decide",
      href: paths.order(shortlisted.request.id, { pitch: shortlisted.pitch.id }),
    });
  }

  // A draft request to finish.
  const draft = requests.find((r) => r.status === "draft");
  if (draft) {
    out.push({
      side: "business",
      tier: 2,
      at: 2,
      eyebrow: "Draft",
      title: "Finish your draft",
      line: `“${draft.title}” is saved but not posted.`,
      action: "Finish draft",
      href: draft.kind === "campaign" ? paths.order(draft.id) : paths.newOrder({ draft: draft.id }),
    });
  }

  return out;
}

function makingCandidates(s: DemoState): Candidate[] {
  const out: Candidate[] = [];
  for (const c of commissionsForCreator(s)) {
    const business = businessById(s, c.businessId)?.name ?? "Your client";
    const slot = c.source === "campaign";
    if (c.status === "offered") {
      out.push({
        side: "creator",
        tier: 0,
        at: Date.parse(c.createdAt),
        eyebrow: "New offer",
        title: `${business} wants ${plural(c.brief.videoCount, "video")}`,
        line: `${money(commissionTotals(c).creatorEarns)} · ${c.title}`,
        action: "Review the offer",
        href: paths.commission(c.id),
      });
    } else if (c.status === "revision") {
      out.push({
        side: "creator",
        tier: 0,
        at: Date.parse(c.dueDate),
        eyebrow: "Changes requested",
        title: `${business} asked for changes`,
        line: slot ? c.title : `${c.title} · ${dueLabel(c.dueDate).text}`,
        action: "See their notes",
        href: paths.commission(c.id),
      });
    } else if (slot && c.status === "completed" && (c.post?.status === "due" || c.post?.status === "removed")) {
      const removed = c.post.status === "removed";
      out.push({
        side: "creator",
        tier: 1,
        at: Date.parse(c.withdrawableFrom ?? c.completedAt ?? c.createdAt),
        eyebrow: removed ? "Post taken down" : "Post due",
        title: removed ? `Put your ${business} post back up` : `Post your video for ${business}`,
        line: removed
          ? `${money(c.price)} is on hold until it's back up.`
          : `${money(c.price)} is released 7 days after we verify it with the brand tag.`,
        action: removed ? "See what to do" : "Post it",
        href: paths.commission(c.id),
      });
    } else if (c.status === "in_progress") {
      out.push({
        side: "creator",
        tier: 1,
        at: Date.parse(c.dueDate),
        eyebrow: slot ? "Campaign" : "Next delivery",
        title: slot ? `Film your review copy for ${business}` : `Deliver to ${business}`,
        line: slot ? c.title : `${c.title} · ${dueLabel(c.dueDate).text}`,
        action: slot ? "Upload review copy" : "Open the commission",
        href: paths.commission(c.id),
      });
    }
  }

  // Follow-up: a shortlisted pitch.
  const shortlisted = pitchesForCreator(s).find((p) => p.status === "shortlisted");
  if (shortlisted) {
    const request = requestById(s, shortlisted.requestId);
    const business = request ? businessById(s, request.businessId)?.name : undefined;
    out.push({
      side: "creator",
      tier: 3,
      at: Date.parse(shortlisted.sentAt),
      eyebrow: "Shortlisted",
      title: `You're on ${business ? possessive(business) : "a"} shortlist`,
      line: request?.title ?? "Your pitch made the cut.",
      action: "View your pitch",
      href: paths.order(shortlisted.requestId),
    });
  }
  return out;
}

/**
 * Most urgent first: someone waiting on you (a delivery or review copies to review, an offer,
 * changes to make), then your own work (a post due, a first version to upload), then follow-ups
 * (pitches to read, a shortlist decision, a draft). Nothing waiting: a suggestion.
 */
export function needsYou(s: DemoState): NeedsYou {
  const candidates = [...orderingCandidates(s), ...makingCandidates(s)].sort(
    (a, b) => a.tier - b.tier || a.at - b.at,
  );
  const top = candidates[0];
  if (top) {
    return {
      side: top.side,
      eyebrow: top.eyebrow,
      title: top.title,
      line: top.line,
      action: top.action,
      href: top.href,
      urgent: true,
    };
  }
  if (me.creator(s)) {
    const joinable = openCampaigns(s).filter((c) => c.eligibility.ok && !c.hidden).length;
    return {
      side: "creator",
      eyebrow: "All caught up",
      title: "Find your next job",
      line: joinable
        ? `${plural(joinable, "campaign")} you can join right now, plus custom requests to pitch on.`
        : "Campaigns and custom requests are waiting in Discover.",
      action: "Discover orders",
      href: paths.explore("orders"),
      urgent: false,
    };
  }
  return {
    side: "business",
    eyebrow: "All caught up",
    title: "Place a new order",
    line: "A UGC campaign for many creators, or a custom request. Payment is held until you approve.",
    action: "New order",
    href: paths.newOrder(),
    urgent: false,
  };
}
