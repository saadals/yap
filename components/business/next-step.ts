import { daysFromNow, money, plural, relativeDay, timeAgo, timeOf, weekdayDate } from "@/lib/format";
import {
  commissionTotals,
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
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  /** Short deadline line ("Auto-approves in 2 days · Fri 6 Nov, 20:00"). */
  deadline?: string;
  people?: { id: string; name: string }[];
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
    const deadline = review.autoApproveAt
      ? `Auto-approves ${relativeDay(review.autoApproveAt)} · ${weekdayDate(review.autoApproveAt)}, ${timeOf(review.autoApproveAt)}`
      : undefined;
    return {
      kind: "review",
      eyebrow: "Ready for your review",
      title: `Review ${possessive(who)} ${formatById[review.brief.format].name.toLowerCase()}`,
      body: `${delivery ? `Version ${delivery.version} arrived ${agoLower(delivery.deliveredAt)}. ` : ""}Approve to release ${money(commissionTotals(review).creatorEarns)} to ${creator?.firstName ?? "them"}, or leave notes on the video.`,
      href: `/business/commissions/${review.id}`,
      deadline,
      people: creator ? [{ id: creator.id, name: creator.name }] : [],
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
    const people = withUnread.unread
      .map((p) => creatorById(s, p.creatorId))
      .filter((c) => c !== undefined)
      .map((c) => ({ id: c.id, name: c.name }));
    return {
      kind: "pitches",
      eyebrow: "Pitches waiting",
      title: `Read ${plural(withUnread.unread.length, "waiting pitch", "waiting pitches")}`,
      body: `On “${withUnread.request.title}”. Compare angles, prices and samples side by side.`,
      href: `/business/requests/${withUnread.request.id}`,
      people,
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
      eyebrow: "Decision to make",
      title: `Decide on ${possessive(who)} pitch`,
      body: `You shortlisted ${who} for “${request.title}” at ${money(pitch.price)}. Hire, or keep looking.`,
      href: `/business/requests/${request.id}`,
      people: creator ? [{ id: creator.id, name: creator.name }] : [],
    };
  }

  // 4. A draft request to finish.
  const draft = requests.find((r) => r.status === "draft");
  if (draft) {
    return {
      kind: "draft",
      eyebrow: "Almost there",
      title: "Finish your draft",
      body: `“${draft.title}” is saved. Add the last details and post it to get pitches within a day.`,
      href: `/business/requests/new?draft=${draft.id}`,
    };
  }

  // 5. Nothing pending: start something.
  return {
    kind: "post",
    eyebrow: "All caught up",
    title: "Post a content request",
    body: "Describe the video you need. Creators who fit send pitches, usually within a day.",
    href: "/business/requests/new",
  };
}
