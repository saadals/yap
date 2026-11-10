/**
 * Seeded UGC campaigns (PM spec "UGC Campaign Flow"). A campaign is a ContentRequest with
 * `kind: "campaign"`; every slot a creator has taken is a Commission with `source: "campaign"`.
 *
 * - r-150 Daftar (Nour's): 10 videos at the 10K–20K tier on TikTok. Slots in every state, one
 *   creator removed earlier, 3 slots open — Layla is eligible and can take one.
 * - r-250 Roundleaf: nearly full ("Only 2 Yapps left"), Layla eligible.
 * - r-251 Souqly: just published, Layla eligible.
 * - r-252 Wayfolk: Instagram 20K–50K, Layla isn't eligible (shows why).
 *
 * Seeded campaigns never fill up on their own; only campaigns created in the browser get simulated
 * creators joining (`campaign.simulate`).
 *
 * Money follows the live rules: each budget was charged with the 10% service fee when posted;
 * approved slots stay held (pending) and get their release date 7 days after the post is verified.
 */
import { withCampaignFee } from "@/lib/campaigns";
import { addDays, at, hoursAgo } from "@/lib/clock";
import { CAMPAIGN_FEE_RATE, CAMPAIGN_OPEN_DAYS, CAMPAIGN_RELEASE_DAYS } from "@/lib/taxonomy";
import type {
  Brief,
  CampaignTerms,
  Commission,
  CommissionEvent,
  ContentRequest,
  Delivery,
  Thread,
  Video,
} from "@/lib/types";

import { videos } from "./videos";

type SlotSeed = {
  slot: number;
  creatorId: string;
  /** Hours ago the slot was taken. */
  takenHoursAgo: number;
  state:
    | "filming"
    | "review" // review copy waiting for the business
    | "revision"
    | "approved_due" // approved, post not made yet
    | "approved_live" // approved, post verified
    | "replaced"; // removed by the business before filming (history)
};

type CampaignSeed = {
  id: string;
  businessId: string;
  productId: string;
  title: string;
  postedDaysAgo: number;
  slots: number;
  terms: Omit<CampaignTerms, "ledger" | "excludedCreatorIds" | "paymentMethodId" | "closesAt">;
  brief: Pick<Brief, "languages" | "audience" | "goal" | "keyMessage" | "mustInclude" | "avoid" | "durationSec"> &
    Partial<Brief>;
  methodId: string;
  views: number;
  taken: SlotSeed[];
};

const seeds: CampaignSeed[] = [
  {
    id: "r-150",
    businessId: "b-daftar",
    productId: "p-daftar-invoices",
    title: "Show us your first invoice on WhatsApp",
    postedDaysAgo: 2,
    slots: 10,
    methodId: "pm-1",
    views: 486,
    terms: {
      tierId: "t10",
      pricePerVideo: 30,
      platform: "tiktok",
      brandHandle: "@daftar.app",
      explainer: { name: "daftar_explainer_60s.mp4", durationSec: 60 },
      deadlineDays: 5,
    },
    brief: {
      languages: ["en"],
      durationSec: 30,
      audience: "Shop owners and home businesses in Canada and the US, 25–55, who chase customers for money.",
      goal: "Real people show how fast an invoice goes out on WhatsApp with Daftar, in their own words.",
      keyMessage: "Send an invoice on WhatsApp in 10 seconds and let Daftar do the chasing.",
      mustInclude: [
        "Say the problem in the first 3 seconds: chasing customers for money",
        "Show the WhatsApp send moment on screen",
        "Mention the automatic reminder",
        "End with: 'Send your first invoice free'",
      ],
      avoid: ["The words 'accounting' or 'bookkeeping'", "Prices or discounts", "Competitor names"],
    },
    taken: [
      { slot: 1, creatorId: "cr-nina", takenHoursAgo: 46, state: "approved_live" },
      { slot: 2, creatorId: "cr-omar", takenHoursAgo: 45, state: "approved_due" },
      { slot: 3, creatorId: "cr-hana", takenHoursAgo: 44, state: "review" },
      { slot: 4, creatorId: "cr-jordan", takenHoursAgo: 40, state: "revision" },
      { slot: 5, creatorId: "cr-aisha", takenHoursAgo: 39, state: "replaced" },
      { slot: 5, creatorId: "cr-leo", takenHoursAgo: 30, state: "filming" },
      { slot: 6, creatorId: "cr-rana", takenHoursAgo: 26, state: "filming" },
      { slot: 7, creatorId: "cr-lina", takenHoursAgo: 9, state: "filming" },
    ],
  },
  {
    id: "r-250",
    businessId: "b-roundleaf",
    productId: "p-roundleaf",
    title: "Your first round-up: film it on Roundleaf",
    postedDaysAgo: 4,
    slots: 10,
    methodId: "pm-roundleaf",
    views: 1240,
    terms: {
      tierId: "t10",
      pricePerVideo: 30,
      platform: "tiktok",
      brandHandle: "@roundleaf.money",
      explainer: { name: "roundleaf_roundups_45s.mp4", durationSec: 45 },
      deadlineDays: 7,
    },
    brief: {
      languages: ["en"],
      durationSec: 30,
      audience: "Young professionals in Canada and the US, 22–35, who want to save but never get round to it.",
      goal: "Viewers see spare change rounding up into savings without thinking about it.",
      keyMessage: "Roundleaf saves your spare change every time you pay.",
      mustInclude: ["Pay for something real (coffee, groceries)", "Show the round-up notification", "Say how much you saved in the first week"],
      avoid: ["Investment or returns promises", "Showing card numbers"],
    },
    taken: [
      { slot: 1, creatorId: "cr-omar", takenHoursAgo: 90, state: "approved_live" },
      { slot: 2, creatorId: "cr-hana", takenHoursAgo: 88, state: "approved_live" },
      { slot: 3, creatorId: "cr-emma", takenHoursAgo: 80, state: "approved_due" },
      { slot: 4, creatorId: "cr-jordan", takenHoursAgo: 70, state: "review" },
      { slot: 5, creatorId: "cr-nina", takenHoursAgo: 60, state: "filming" },
      { slot: 6, creatorId: "cr-priya", takenHoursAgo: 50, state: "filming" },
      { slot: 7, creatorId: "cr-mateo", takenHoursAgo: 30, state: "filming" },
      { slot: 8, creatorId: "cr-sofia", takenHoursAgo: 12, state: "filming" },
    ],
  },
  {
    id: "r-251",
    businessId: "b-souqly",
    productId: "p-souqly",
    title: "Open your shop on Souqly in one coffee",
    postedDaysAgo: 0,
    slots: 15,
    methodId: "pm-souqly",
    views: 132,
    terms: {
      tierId: "t10",
      pricePerVideo: 30,
      platform: "tiktok",
      brandHandle: "@souqly",
      deadlineDays: 3,
    },
    brief: {
      languages: ["en", "ar"],
      durationSec: 40,
      audience: "People, 20–40, who sell through Instagram DMs in English or Arabic and want a real store link.",
      goal: "Viewers see a store go live in the time it takes to finish a coffee.",
      keyMessage: "Your store link, live before your coffee gets cold.",
      mustInclude: ["Start a timer at the beginning", "Add one real product", "Share the store link at the end"],
      avoid: ["Saying it's free forever", "Other store builders by name"],
    },
    taken: [
      { slot: 1, creatorId: "cr-lina", takenHoursAgo: 3, state: "filming" },
      { slot: 2, creatorId: "cr-rana", takenHoursAgo: 2, state: "filming" },
    ],
  },
  {
    id: "r-252",
    businessId: "b-wayfolk",
    productId: "p-wayfolk",
    title: "Plan a weekend away with Wayfolk",
    postedDaysAgo: 1,
    slots: 10,
    methodId: "pm-wayfolk",
    views: 388,
    terms: {
      tierId: "t20",
      pricePerVideo: 40,
      platform: "instagram",
      brandHandle: "@wayfolk.travel",
      explainer: { name: "wayfolk_planner_50s.mp4", durationSec: 50 },
      deadlineDays: 5,
    },
    brief: {
      languages: ["en"],
      durationSec: 45,
      audience: "Friends and families in the US and Canada, 20–40, planning short winter trips.",
      goal: "Viewers plan a real weekend in the app and feel it's easier than a group chat.",
      keyMessage: "From group chat chaos to a plan in five minutes.",
      mustInclude: ["Show the shared plan with friends", "Book one real stop", "Reels format, under 45 seconds"],
      avoid: ["Flights (we don't sell them yet)", "Prices that change by date"],
    },
    taken: [
      { slot: 1, creatorId: "cr-hana", takenHoursAgo: 20, state: "filming" },
      { slot: 2, creatorId: "cr-priya", takenHoursAgo: 8, state: "filming" },
    ],
  },
];

function briefFor(seed: CampaignSeed): Brief {
  return {
    productId: seed.productId,
    format: "testimonial",
    platforms: [seed.terms.platform],
    aspect: "9:16",
    videoCount: 1,
    references: [],
    onCamera: true,
    addons: [],
    ...seed.brief,
  };
}

function reviewCopy(creatorId: string, id: string, title: string): Video {
  const source =
    videos.find((v) => v.creatorId === creatorId && v.aspect === "9:16") ??
    videos.find((v) => v.creatorId === creatorId) ??
    videos[0];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { stats, ...rest } = source;
  return { ...rest, id, title, format: "testimonial", aspect: "9:16" };
}

const iso = (hoursAgoValue: number) => hoursAgo(hoursAgoValue);

function slotCommission(seed: CampaignSeed, s: SlotSeed, index: number): Commission {
  const id = `c-${seed.id.slice(2)}-${index + 1}`;
  const takenAt = iso(s.takenHoursAgo);
  const title = seed.title;
  const ev = (n: number, kind: CommissionEvent["kind"], actor: CommissionEvent["actor"], text: string, at: string): CommissionEvent => ({
    id: `ev-${id}-${n}`,
    at,
    kind,
    actor,
    text,
  });
  const events: CommissionEvent[] = [
    ev(1, "slot_accepted", "creator", `Took slot ${s.slot}`, takenAt),
  ];
  const deliveries: Delivery[] = [];
  const firstUpload = iso(Math.max(1, s.takenHoursAgo - 18));
  const file = (v: number) => [{ name: `${seed.id}_slot${s.slot}_v${v}_review_copy.mp4`, size: `${(9 + v * 1.3).toFixed(1)} MB` }];
  let status: Commission["status"] = "in_progress";
  let payment: Commission["payment"]["status"] = "held";
  let post: Commission["post"];
  let completedAt: string | undefined;
  let withdrawableFrom: string | undefined;
  let cancelCode: Commission["cancelCode"];
  let autoApproveAt: string | undefined;

  if (s.state === "replaced") {
    status = "cancelled";
    payment = "returned";
    cancelCode = "replaced";
    events.push(ev(2, "creator_replaced", "business", "Removed from the campaign. The slot reopened for other creators.", iso(s.takenHoursAgo - 6)));
  }
  if (s.state === "review" || s.state === "revision" || s.state === "approved_due" || s.state === "approved_live") {
    deliveries.push({
      id: `d-${id}-1`,
      version: 1,
      video: reviewCopy(s.creatorId, `v-${id}-1`, `${title} — review copy`),
      note: "Review copy is up (watermarked). Filmed it the way the brief asks.",
      deliveredAt: firstUpload,
      status: s.state === "review" ? "in_review" : s.state === "revision" ? "changes_requested" : "approved",
      comments:
        s.state === "revision"
          ? [{ id: `dc-${id}-1`, atSec: 4, text: "Can you show the WhatsApp send a bit earlier? It's at 9s now.", author: "business", resolved: false, createdAt: iso(s.takenHoursAgo - 22) }]
          : [],
      files: file(1),
      reviewCopy: true,
    });
    events.push(ev(2, "delivered", "creator", "Review copy uploaded (version 1)", firstUpload));
  }
  if (s.state === "review") {
    status = "delivered";
    autoApproveAt = at(3, "20:00");
  }
  if (s.state === "revision") {
    status = "revision";
    events.push(ev(3, "revision_requested", "business", "Changes requested on version 1 (1 note)", iso(s.takenHoursAgo - 22)));
  }
  if (s.state === "approved_due" || s.state === "approved_live") {
    status = "completed";
    payment = "pending";
    completedAt = iso(Math.max(1, s.takenHoursAgo - 24));
    events.push(ev(3, "approved", "business", "Version 1 approved. Full-quality file unlocked.", completedAt));
    events.push(
      ev(4, "paid", "system", `$${seed.terms.pricePerVideo} stays held until ${CAMPAIGN_RELEASE_DAYS} days after the post is verified`, completedAt),
    );
    post = { status: "due" };
  }
  if (s.state === "approved_live") {
    const postedAt = iso(Math.max(1, s.takenHoursAgo - 30));
    // Verified a few minutes after posting; the pay is released 7 days later if the post is up.
    const verifiedAt = addDays(postedAt, 4 / (24 * 60));
    withdrawableFrom = addDays(verifiedAt, CAMPAIGN_RELEASE_DAYS);
    post = {
      status: "live",
      url: `https://www.tiktok.com/@creator/video/${7300000000 + index * 7919}`,
      at: postedAt,
      verifiedAt,
      tagFound: true,
      disclosureFound: true,
    };
    events.push(ev(5, "posted", "creator", "Posted on their account", postedAt));
    events.push(ev(6, "post_verified", "system", `Post verified: ${seed.terms.brandHandle} tagged, paid partnership label on`, verifiedAt));
  }

  return {
    id,
    businessId: seed.businessId,
    creatorId: s.creatorId,
    title,
    brief: briefFor(seed),
    source: "campaign",
    requestId: seed.id,
    price: seed.terms.pricePerVideo,
    addons: [],
    feeRate: CAMPAIGN_FEE_RATE,
    revisionsIncluded: 2,
    revisionsUsed: s.state === "revision" ? 1 : 0,
    status,
    createdAt: takenAt,
    acceptedAt: takenAt,
    // Version 1 is due within the deadline the brand set.
    dueDate: addDays(takenAt, seed.terms.deadlineDays),
    completedAt,
    autoApproveAt,
    deliveries,
    events,
    threadId: `t-${id.slice(2)}`,
    payment: { status: payment, methodId: seed.methodId },
    campaignSlot: s.slot,
    post,
    withdrawableFrom,
    cancelCode,
    quickRating: s.state === "approved_live" ? 5 : undefined,
  };
}

export const campaignRequests: ContentRequest[] = seeds.map((seed) => {
  const active = seed.taken.filter((t) => t.state !== "replaced").length;
  const budget = withCampaignFee(seed.slots * seed.terms.pricePerVideo);
  return {
    id: seed.id,
    businessId: seed.businessId,
    title: seed.title,
    brief: briefFor(seed),
    budget: { min: seed.terms.pricePerVideo, max: seed.terms.pricePerVideo },
    dueDate: at(30, "18:00"),
    postedAt: at(-seed.postedDaysAgo, "11:00"),
    status: active >= seed.slots ? "hired" : "open",
    visibility: "public",
    invitedCreatorIds: [],
    preferredKinds: [],
    slots: seed.slots,
    views: seed.views,
    kind: "campaign",
    campaign: {
      ...seed.terms,
      closesAt: at(CAMPAIGN_OPEN_DAYS - seed.postedDaysAgo, "11:00"),
      paymentMethodId: seed.methodId,
      ledger: [
        {
          id: `lg-${seed.id}-1`,
          at: at(-seed.postedDaysAgo, "10:58"),
          kind: "charge",
          amount: budget.total,
          fee: budget.fee,
          note: `${seed.slots} videos × $${seed.terms.pricePerVideo}, plus the ${Math.round(CAMPAIGN_FEE_RATE * 100)}% service fee`,
        },
      ],
      excludedCreatorIds: seed.taken.filter((t) => t.state === "replaced").map((t) => t.creatorId),
    },
  };
});

export const campaignCommissions: Commission[] = seeds.flatMap((seed) =>
  seed.taken.map((slot, index) => slotCommission(seed, slot, index)),
);

/** Slot threads start empty (hidden from inboxes until someone writes). */
export const campaignThreads: Thread[] = campaignCommissions.map((c) => ({
  id: c.threadId,
  businessId: c.businessId,
  creatorId: c.creatorId,
  commissionId: c.id,
  requestId: c.requestId,
  subject: c.title,
  messages: [],
  unread: [],
}));
