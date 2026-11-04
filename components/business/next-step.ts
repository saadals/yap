import { daysFromNow, money, plural, timeAgo, weekdayDate } from "@/lib/format";
import {
  commissionsForBusiness,
  creatorById,
  latestDelivery,
  pitchesForRequest,
  requestsForBusiness,
} from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";
import type { Pitch } from "@/lib/types";

/** The single most useful thing for the business to do right now (shown as the neon block). */
export type NextStep = {
  kind: "review" | "pitches" | "shortlist" | "draft" | "post";
  title: string;
  /** One short supporting line. */
  line: string;
  /** Verb for the block's single action ("Review", "Read pitches"). */
  action: string;
  href: string;
};

/** Pitches the business hasn't opened yet. */
export const unreadPitches = (s: DemoState, requestId: string) =>
  pitchesForRequest(s, requestId).filter((p) => p.status === "sent");

/** Pitches sent today or yesterday (demo clock). */
export const recentPitches = (s: DemoState, requestId: string) =>
  pitchesForRequest(s, requestId).filter(
    (p) => p.status !== "declined" && -daysFromNow(p.sentAt) <= 1,
  );

/** timeAgo, lower-cased for mid-sentence use ("yesterday", "3h ago", "7 Nov"). */
export const agoLower = (iso: string) => {
  const ago = timeAgo(iso);
  return ago === "Yesterday" ? "yesterday" : ago;
};

const possessive = (name: string) => (name.endsWith("s") ? `${name}'` : `${name}'s`);

export function nextStep(s: DemoState): NextStep {
  // 1. A delivery waiting for review: the clock is running.
  const review = commissionsForBusiness(s)
    .filter((c) => c.status === "delivered")
    .sort(
      (a, b) =>
        Date.parse(a.autoApproveAt ?? a.dueDate) - Date.parse(b.autoApproveAt ?? b.dueDate),
    )[0];
  if (review) {
    const creator = creatorById(s, review.creatorId);
    const delivery = latestDelivery(review);
    const who = creator?.firstName ?? "Your creator";
    const parts = [
      delivery ? `Version ${delivery.version} arrived ${agoLower(delivery.deliveredAt)}.` : "",
      review.autoApproveAt ? `Auto-approves ${weekdayDate(review.autoApproveAt)}.` : "",
    ];
    return {
      kind: "review",
      title: `Review ${possessive(who)} ${formatById[review.brief.format].name.toLowerCase()}`,
      line: parts.filter(Boolean).join(" ") || "Approve it or leave notes on the video.",
      action: "Review",
      href: `/business/commissions/${review.id}`,
    };
  }

  const requests = requestsForBusiness(s);
  const open = requests.filter((r) => r.status === "open");

  // 2. Unread pitches on an open request (most unread first).
  const withUnread = open
    .map((request) => ({ request, unread: unreadPitches(s, request.id) }))
    .filter((entry) => entry.unread.length > 0)
    .sort((a, b) => b.unread.length - a.unread.length)[0];
  if (withUnread) {
    return {
      kind: "pitches",
      title: `Read ${plural(withUnread.unread.length, "waiting pitch", "waiting pitches")}`,
      line: `On “${withUnread.request.title}”.`,
      action: "Read pitches",
      href: `/business/requests/${withUnread.request.id}`,
    };
  }

  // 3. A shortlisted pitch that needs a decision.
  const shortlisted = open
    .flatMap((request) =>
      pitchesForRequest(s, request.id)
        .filter((p) => p.status === "shortlisted")
        .map((pitch): [Pitch, typeof request] => [pitch, request]),
    )
    .sort((a, b) => Date.parse(a[0].sentAt) - Date.parse(b[0].sentAt))[0];
  if (shortlisted) {
    const [pitch, request] = shortlisted;
    const creator = creatorById(s, pitch.creatorId);
    const who = creator?.firstName ?? "your shortlisted creator";
    return {
      kind: "shortlist",
      title: `Decide on ${possessive(who)} pitch`,
      line: `${money(pitch.price)} for “${request.title}”.`,
      action: "Decide",
      href: `/business/requests/${request.id}`,
    };
  }

  // 4. A draft request to finish.
  const draft = requests.find((r) => r.status === "draft");
  if (draft) {
    return {
      kind: "draft",
      title: "Finish your draft",
      line: `“${draft.title}” is saved but not posted.`,
      action: "Finish draft",
      href: `/business/requests/new?draft=${draft.id}`,
    };
  }

  // 5. Nothing pending: start something.
  return {
    kind: "post",
    title: "Post a content request",
    line: "Creators who fit send pitches, usually within a day.",
    action: "New request",
    href: "/business/requests/new",
  };
}
