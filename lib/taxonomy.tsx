import {
  ArrowLeftRight,
  BadgeCheck,
  Captions,
  Clapperboard,
  Clock,
  Film,
  Layers,
  type LucideIcon,
  Megaphone,
  MessageSquareQuote,
  Mic,
  MonitorPlay,
  PackageOpen,
  Repeat2,
  Smartphone,
  Speech,
  Type,
  Video,
  Zap,
} from "lucide-react";

import type {
  AddonId,
  Aspect,
  CampaignPlatformId,
  CommissionStatus,
  CountryId,
  CreatorKind,
  FollowerTierId,
  FormatId,
  JobType,
  LanguageId,
  NicheId,
  PitchStatus,
  PlatformId,
  RequestStatus,
  Role,
  UsageOptionId,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Content formats: the launch set, tuned for tech products (video only;      */
/* ad copy's format slot is `adCopyFormat`, below the list).                   */
/* -------------------------------------------------------------------------- */

export type FormatInfo = {
  id: FormatId;
  name: string;
  /** Lowercase nouns for sentences: one and many ("2 app demos"). */
  noun: [string, string];
  short: string;
  description: string;
  /** Typical length range in seconds. */
  typical: [number, number];
  /** Usually made with nobody on camera (a voice over the screen or footage). */
  voiceOnly?: boolean;
  icon: LucideIcon;
  /** Example structure shown in briefs and on the landing page. */
  beats: string[];
};

export const formats: FormatInfo[] = [
  {
    id: "app-demo",
    name: "App demo",
    noun: ["app demo", "app demos"],
    short: "Talk to camera, then show the app",
    description:
      "A creator films themselves with a relatable problem, demos your app on their phone, and tells viewers to try it.",
    typical: [30, 60],
    icon: Smartphone,
    beats: ["Relatable hook", "The problem", "Phone demo", "Try it today"],
  },
  {
    id: "screen-walkthrough",
    name: "Screen walkthrough",
    noun: ["screen walkthrough", "screen walkthroughs"],
    short: "Voiceover over a clean screen recording",
    description:
      "A tidy screen recording of your product with a natural voiceover. No face required, great for features and onboarding.",
    typical: [45, 120],
    voiceOnly: true,
    icon: MonitorPlay,
    beats: ["What you'll learn", "Step by step", "The result", "Where to start"],
  },
  {
    id: "unboxing",
    name: "Unboxing",
    noun: ["unboxing", "unboxings"],
    short: "Out of the box, set up, first impressions",
    description:
      "The creator opens your device on camera, sets it up with its companion app and shares honest first impressions.",
    typical: [30, 90],
    icon: PackageOpen,
    beats: ["The box", "First look", "Setup", "First impressions"],
  },
  {
    id: "problem-solution",
    name: "Problem → solution",
    noun: ["problem → solution video", "problem → solution videos"],
    short: "The pain first, then your product fixes it",
    description:
      "A quick scene that plays out an everyday problem, then shows your product solving it in seconds.",
    typical: [15, 40],
    icon: Clapperboard,
    beats: ["The situation", "It gets worse", "The fix", "Call to action"],
  },
  {
    id: "comparison",
    name: "Comparison",
    noun: ["comparison", "comparisons"],
    short: "Your product next to the usual way",
    description:
      "Side by side with the old way or the tool people use today, told fairly, so viewers see the difference for themselves.",
    typical: [30, 60],
    icon: ArrowLeftRight,
    beats: ["The question", "The usual way", "Your product", "The verdict"],
  },
  {
    id: "testimonial",
    name: "Testimonial",
    noun: ["testimonial", "testimonials"],
    short: "Why they switched and what they love",
    description:
      "A real-feeling story: the creator shares how they used your product and what changed. Built for trust.",
    typical: [20, 45],
    icon: MessageSquareQuote,
    beats: ["Before", "What I tried", "What changed", "My verdict"],
  },
  {
    id: "talking-head",
    name: "Talking head",
    noun: ["talking head video", "talking head videos"],
    short: "Straight to camera, one clear idea",
    description:
      "The creator speaks straight to camera about one feature, tip or workflow, clearly enough that viewers can follow along.",
    typical: [30, 120],
    icon: Speech,
    beats: ["The point", "Why it matters", "How to do it", "Recap"],
  },
  {
    id: "voiceover",
    name: "Voiceover",
    noun: ["voiceover video", "voiceover videos"],
    short: "Narration over product footage, no face",
    description:
      "A narrated story over screen recordings, product shots or b-roll. Nobody on camera: the voice and the edit carry it.",
    typical: [15, 45],
    voiceOnly: true,
    icon: Mic,
    beats: ["Hook line", "The story", "Product moment", "Call to action"],
  },
  {
    id: "hook-pack",
    name: "Ad hook pack",
    noun: ["ad hook pack", "ad hook packs"],
    short: "3–5 openings for paid ad testing",
    description:
      "Several short alternative openings filmed for one ad body, so you can test which hook performs best.",
    typical: [5, 12],
    icon: Layers,
    beats: ["Hook A", "Hook B", "Hook C", "Shared body"],
  },
];

/**
 * The format slot of an ad-copy brief. Not a video format, so it is kept out of `formats` (pickers
 * and the format filter never offer it); it lives in `formatById` so a screen that prints a brief's
 * format reads "Ad copy writing" instead of a video format.
 */
export const adCopyFormat: FormatInfo = {
  id: "ad-copy",
  name: "Ad copy writing",
  noun: ["ad copy", "ad copy"],
  short: "Written ad copy, no video",
  description:
    "Headlines, primary text and calls to action for the brand's ads, delivered as text or a document. Nothing is filmed or posted.",
  typical: [0, 0],
  icon: Type,
  beats: ["Headline", "Primary text", "Call to action"],
};

export const formatById = Object.fromEntries(
  [...formats, adCopyFormat].map((f) => [f.id, f]),
) as Record<FormatId, FormatInfo>;

/* -------------------------------------------------------------------------- */
/* Job types (round 3 answers, item 27; the Work filter "Job type", item 28)  */
/* -------------------------------------------------------------------------- */

export const jobTypes: { id: JobType; name: string; short: string; icon: LucideIcon; description: string }[] = [
  {
    id: "video",
    name: "Full video",
    short: "Video",
    icon: Clapperboard,
    description: "A finished video, filmed and edited by the creator.",
  },
  {
    id: "ad-copy",
    name: "Ad copy writing",
    short: "Ad copy",
    icon: Type,
    description:
      "Written ad copy, delivered as text or a document. A custom order only: no filming, no posting, no follower tier.",
  },
];

export const jobTypeById = Object.fromEntries(jobTypes.map((j) => [j.id, j])) as Record<
  JobType,
  (typeof jobTypes)[number]
>;

/** Documents an ad-copy delivery can be attached as. */
export const AD_COPY_DOCUMENT_TYPES = ["pdf", "doc", "docx", "txt"] as const;

/* -------------------------------------------------------------------------- */
/* Order kinds (interface names, round 3 answers item 18)                      */
/* -------------------------------------------------------------------------- */

/** The two kinds of order, as the interface names them. `custom` = ContentRequest without `kind: "campaign"`. */
export const orderKinds: Record<"campaign" | "custom", { name: string; plural: string; action: string; short: string }> = {
  campaign: { name: "UGC campaign", plural: "UGC campaigns", action: "Pick now", short: "Campaign" },
  custom: { name: "Custom order", plural: "Custom orders", action: "Pitch now", short: "Custom order" },
};

/** The action that takes a campaign slot, everywhere (round 3 answers, item 16). */
export const PICK_NOW = "Pick now";

/* -------------------------------------------------------------------------- */
/* Platforms                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Where the brand will run a custom order (Work spec 6.5.5). "Meta ads" is an ad placement, not a
 * place to post (round 3 answers, item 38): campaigns use `campaignPlatforms` below.
 */
export const platforms: { id: PlatformId; name: string; short: string }[] = [
  { id: "tiktok", name: "TikTok", short: "TikTok" },
  { id: "instagram", name: "Instagram Reels", short: "Reels" },
  { id: "facebook", name: "Facebook", short: "Facebook" },
  { id: "meta-ads", name: "Meta ads", short: "Meta ads" },
  { id: "youtube", name: "YouTube Shorts", short: "Shorts" },
  { id: "snapchat", name: "Snapchat", short: "Snap" },
  { id: "linkedin", name: "LinkedIn", short: "LinkedIn" },
  { id: "x", name: "X", short: "X" },
];

export const platformById = Object.fromEntries(platforms.map((p) => [p.id, p])) as Record<
  PlatformId,
  (typeof platforms)[number]
>;

/* -------------------------------------------------------------------------- */
/* Video languages (English first; the default everywhere)                     */
/* -------------------------------------------------------------------------- */

export const languages: { id: LanguageId; name: string }[] = [
  { id: "en", name: "English" },
  { id: "es", name: "Spanish" },
  { id: "fr", name: "French" },
  { id: "ar", name: "Arabic" },
  { id: "pt", name: "Portuguese" },
  { id: "hi", name: "Hindi" },
  { id: "ko", name: "Korean" },
  { id: "zh", name: "Chinese" },
];

export const languageById = Object.fromEntries(languages.map((l) => [l.id, l])) as Record<
  LanguageId,
  (typeof languages)[number]
>;

export const DEFAULT_LANGUAGE: LanguageId = "en";

/** Videos in any language but English carry an English translation of their captions. */
export const isTranslated = (id: LanguageId) => id !== "en";

/** Writing direction for text in this language (the ids double as `lang` attributes). */
export const textDir = (id: LanguageId): "rtl" | "ltr" => (id === "ar" ? "rtl" : "ltr");

/* -------------------------------------------------------------------------- */
/* Categories (product niches)                                                 */
/* -------------------------------------------------------------------------- */

/** `noun` reads mid-sentence: "Works with health tech". */
export const niches: { id: NicheId; name: string; noun: string }[] = [
  { id: "ai", name: "AI tools", noun: "AI tools" },
  { id: "consumer", name: "Consumer apps", noun: "consumer apps" },
  { id: "b2b", name: "SaaS & B2B", noun: "SaaS and B2B products" },
  { id: "fintech", name: "Fintech", noun: "fintech" },
  { id: "gadgets", name: "Gadgets & audio", noun: "gadgets and audio" },
  { id: "gaming", name: "Gaming", noun: "gaming" },
  { id: "health", name: "Health tech", noun: "health tech" },
  { id: "ecommerce", name: "E-commerce tech", noun: "e-commerce tech" },
];

export const nicheById = Object.fromEntries(niches.map((n) => [n.id, n])) as Record<
  NicheId,
  (typeof niches)[number]
>;

/* -------------------------------------------------------------------------- */
/* Creator kinds                                                               */
/* -------------------------------------------------------------------------- */

export const creatorKinds: {
  id: CreatorKind;
  name: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: "presenter",
    name: "Everyday presenter",
    description: "Natural on camera. Relatable, quick, affordable.",
    icon: Video,
  },
  {
    id: "producer",
    name: "Video producer",
    description: "Scripted, lit and edited to a polished standard.",
    icon: Film,
  },
  {
    id: "influencer",
    name: "Influencer",
    description: "Can also publish to their own audience.",
    icon: Megaphone,
  },
];

export const creatorKindById = Object.fromEntries(creatorKinds.map((k) => [k.id, k])) as Record<
  CreatorKind,
  (typeof creatorKinds)[number]
>;

/* -------------------------------------------------------------------------- */
/* Add-ons                                                                     */
/* -------------------------------------------------------------------------- */

export const addons: {
  id: AddonId;
  name: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: "extra-revision",
    name: "Extra revision round",
    description: "One more round of changes on top of the package.",
    icon: Repeat2,
  },
  {
    id: "subtitles",
    name: "Burned-in subtitles",
    description: "Captions in the video's language, styled for silent autoplay.",
    icon: Captions,
  },
  {
    id: "rush",
    name: "Rush delivery",
    description: "First version delivered faster than the package time.",
    icon: Zap,
  },
  {
    id: "extra-hooks",
    name: "3 alternate hooks",
    description: "Three extra openings for A/B testing.",
    icon: Layers,
  },
  {
    id: "post-to-account",
    name: "Post to creator's account",
    description: "The creator also publishes it to their own followers.",
    icon: Megaphone,
  },
];

export const addonById = Object.fromEntries(addons.map((a) => [a.id, a])) as Record<
  AddonId,
  (typeof addons)[number]
>;

/* -------------------------------------------------------------------------- */
/* Usage rights (one of four per order, included in the price)                 */
/* -------------------------------------------------------------------------- */

/**
 * How the brand may use the videos. The brand picks one on every order (custom orders, direct
 * orders and campaigns); it is part of the price, never a separate fee, and creators see it before
 * they pitch or pick. Every option includes posting on the brand's own accounts.
 */
export const usageOptions: {
  id: UsageOptionId;
  name: string;
  /** For a sentence: "paid ads for 12 months". */
  phrase: string;
  description: string;
}[] = [
  {
    id: "ads-12m",
    name: "Paid ads · 12 months",
    phrase: "paid ads for 12 months",
    description: "Post it on your own accounts and run it as a paid ad for 12 months.",
  },
  {
    id: "ads-6m",
    name: "Paid ads · 6 months",
    phrase: "paid ads for 6 months",
    description: "Post it on your own accounts and run it as a paid ad for 6 months.",
  },
  {
    id: "organic",
    name: "Organic only",
    phrase: "organic use only",
    description: "Post it on your own accounts. No paid ads.",
  },
  {
    id: "ads-forever",
    name: "Paid ads · no end date",
    phrase: "paid ads with no end date",
    description: "Post it on your own accounts and run it as a paid ad with no end date.",
  },
];

export const usageById = Object.fromEntries(usageOptions.map((u) => [u.id, u])) as Record<
  UsageOptionId,
  (typeof usageOptions)[number]
>;

/** Preselected on every new order. */
export const DEFAULT_USAGE: UsageOptionId = "ads-12m";

/** "Usage: paid ads for 12 months, included in the price. Raw footage included." */
export const includedWith = (usage: UsageOptionId) =>
  `Usage: ${usageById[usage].phrase}, included in the price. Raw footage included.`;

/** Comes with every approved video (never an add-on). */
export const RAW_FOOTAGE_INCLUDED = "Raw footage included with every approved video.";

/* -------------------------------------------------------------------------- */
/* Misc                                                                        */
/* -------------------------------------------------------------------------- */

export const aspects: { id: Aspect; name: string; use: string }[] = [
  { id: "9:16", name: "Vertical 9:16", use: "TikTok, Reels, Shorts, Snapchat" },
  { id: "4:5", name: "Portrait 4:5", use: "Instagram and Facebook feed" },
  { id: "1:1", name: "Square 1:1", use: "Feeds and ads" },
  { id: "16:9", name: "Landscape 16:9", use: "YouTube, websites, onboarding" },
];

/** Countries of the seed cities (lib/data/cities.ts), US and Canada first. */
export const countries: Record<CountryId, { name: string; flag: string }> = {
  us: { name: "United States", flag: "US" },
  ca: { name: "Canada", flag: "CA" },
  br: { name: "Brazil", flag: "BR" },
  eg: { name: "Egypt", flag: "EG" },
  ng: { name: "Nigeria", flag: "NG" },
  sa: { name: "Saudi Arabia", flag: "SA" },
  ae: { name: "United Arab Emirates", flag: "AE" },
  gb: { name: "United Kingdom", flag: "GB" },
};

/**
 * Platform economics (round 3 answers, item 6 and G1). Yapp keeps 20% of every transaction
 * (campaign slots, custom orders, direct orders, add-ons, paid extra revisions), deducted from what
 * the creator is paid. The brand pays the listed price and nothing on top; the creator receives
 * 80%. A refund returns the price the brand paid, and Yapp keeps no fee on it. The split itself is
 * computed only by `priceBreakdown()` in lib/format.ts.
 */
export const PLATFORM_FEE_RATE = 0.2;
/** The fee as a whole percentage, for copy ("after the 20% Yapp fee"). */
export const FEE_PCT = Math.round(PLATFORM_FEE_RATE * 100);
/** Custom and direct orders (the same 20%). */
export const SERVICE_FEE_RATE = PLATFORM_FEE_RATE;
export const AUTO_APPROVE_DAYS = 3;

/**
 * Price limits per Yapp (one video), on the listed price: packages, pitches and campaign prices
 * stay inside them. At the floor the creator's net is $24.
 */
export const PRICE_MIN_PER_YAPP = 30;
export const PRICE_MAX_PER_YAPP = 5_000;
/** The lowest price a pitch can name. */
export const PITCH_MIN = 30;
/** The lowest budget a custom order can post with. */
export const BUDGET_MIN = 50;

/* -------------------------------------------------------------------------- */
/* Orders (both kinds)                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Days the brand gives the creator to deliver version 1: a custom order counts from the hire, a
 * campaign from the moment a creator picks a slot. Set by the brand, shown as "set by {brand}".
 */
export const ORDER_DEADLINE_OPTIONS = [2, 3, 5, 7, 10] as const;
export const ORDER_DEADLINE_DEFAULT = 5;
/** Every open order stops taking pitches or picks this many days after posting (`closesAt`). */
export const ORDER_OPEN_DAYS = 14;
/** An order posted within this many days counts as new (the "New" tag, Find work's recommended sort). */
export const NEW_ORDER_DAYS = 2;

/* -------------------------------------------------------------------------- */
/* Comments on deliveries (Site-wide spec 5.5.4, round 3 answers G1)           */
/* -------------------------------------------------------------------------- */

/** Comments stay open this many days after an order completes, then become read-only. */
export const COMMENTS_OPEN_DAYS = 30;
/** The shortest comment or reply. */
export const COMMENT_MIN_CHARS = 2;
/** "Request changes" needs one ticked comment, or a note at least this long. */
export const CHANGE_NOTE_MIN_CHARS = 10;

/* -------------------------------------------------------------------------- */
/* Brief attachments (Work spec 6.11.7)                                        */
/* -------------------------------------------------------------------------- */

export const BRIEF_ATTACHMENT_LIMITS = {
  /** Each file. */
  maxBytes: 10 * 1024 * 1024,
  maxImages: 10,
  maxVideos: 1,
  /** A reference video's longest length (0.5 s of slack for metadata rounding). */
  maxVideoSec: 20,
  videoSlackSec: 0.5,
  documentTypes: ["pdf", "doc", "docx", "txt", "md"],
} as const;

/* -------------------------------------------------------------------------- */
/* Find work (Work spec 6.5)                                                   */
/* -------------------------------------------------------------------------- */

export const WORK_PAGE_SIZE = 12;
/** "Pay at least" options, in listed prices (per Yapp for campaigns, the budget's top for custom orders). */
export const WORK_PAY_STEPS = [150, 300, 500] as const;
/** "Closes within" options, in days. */
export const WORK_CLOSING_STEPS = [3, 7] as const;

/* -------------------------------------------------------------------------- */
/* UGC campaigns (PM spec "UGC Campaign Flow", legal pack Brand Terms §3–7)    */
/* -------------------------------------------------------------------------- */

/**
 * Campaign slots carry the same 20%, deducted from each creator's pay when the slot is released.
 * The brand is charged slots × price when the campaign is posted, nothing on top.
 */
export const CAMPAIGN_FEE_RATE = PLATFORM_FEE_RATE;
/** Minimum videos per campaign, each from a different creator. */
export const CAMPAIGN_MIN_VIDEOS = 10;
/** Video counts go up in steps of 5: 10, 15, 20, … */
export const CAMPAIGN_STEP = 5;
export const CAMPAIGN_MAX_VIDEOS = 50;

/** Days the brand can give a creator to upload version 1 after taking a slot (fixed once posted). */
export const CAMPAIGN_DEADLINE_OPTIONS = ORDER_DEADLINE_OPTIONS;
export const CAMPAIGN_DEADLINE_DEFAULT = ORDER_DEADLINE_DEFAULT;
/** A campaign stays open for this many days unless the brand closes it earlier. */
export const CAMPAIGN_OPEN_DAYS = ORDER_OPEN_DAYS;
/** A slot's pay is released this many days after the creator's post is verified, if it's still live. */
export const CAMPAIGN_RELEASE_DAYS = 7;
/** The post must stay up this long from verification (checked daily). */
export const CAMPAIGN_KEEP_LIVE_DAYS = 30;
/** A post that comes down has this long to be restored before the slot goes back to the brand. */
export const CAMPAIGN_RESTORE_HOURS = 48;

/*
 * Deferred by the PM ("leave as placeholders"). null = not set; the UI stays quiet and nothing is
 * enforced.
 */
/** Penalty for repeated rejections, and who it applies to. */
export const CAMPAIGN_REJECTION_PENALTY: string | null = null;
/** Most times one slot can be reassigned within a campaign. */
export const CAMPAIGN_MAX_REASSIGNMENTS: number | null = null;

export type FollowerTier = {
  id: FollowerTierId;
  /** Real followers, half-open band: min ≤ followers < max. */
  min: number;
  max: number;
  label: string;
};

/**
 * The business picks a tier; it only decides who may pick a slot (verified followers inside the
 * band). Tiers carry no price: the brand sets the price per Yapp, and lib/pricing.ts scales the
 * guidance range by tier.
 */
export const followerTiers: FollowerTier[] = [
  { id: "t10", min: 10_000, max: 20_000, label: "10K–20K" },
  { id: "t20", min: 20_000, max: 50_000, label: "20K–50K" },
  { id: "t50", min: 50_000, max: 100_000, label: "50K–100K" },
  { id: "t100", min: 100_000, max: 250_000, label: "100K–250K" },
  { id: "t250", min: 250_000, max: Number.POSITIVE_INFINITY, label: "250K+" },
];

export const tierById = Object.fromEntries(followerTiers.map((t) => [t.id, t])) as Record<
  FollowerTierId,
  FollowerTier
>;

export const tierFor = (followers: number) =>
  followerTiers.find((t) => followers >= t.min && followers < t.max);

/**
 * Where a campaign video gets posted: only platforms where a creator's account can be connected
 * and verified (round 3 answers, item 38). A campaign may list several; each creator posts on one.
 * `hosts` are what the post-link check accepts (`postLinkProblem()` in lib/campaigns.ts).
 */
export const campaignPlatforms: {
  id: CampaignPlatformId;
  name: string;
  disclosure: string;
  hosts: string[];
  /** A link of the right shape, for placeholders: "{handle}" is the creator's handle. */
  example: string;
}[] = [
  {
    id: "tiktok",
    name: "TikTok",
    disclosure: "Paid partnership label (Content disclosure → Paid partnership)",
    hosts: ["tiktok.com"],
    example: "https://www.tiktok.com/@{handle}/video/…",
  },
  {
    id: "instagram",
    name: "Instagram",
    disclosure: "Paid partnership label",
    hosts: ["instagram.com"],
    example: "https://www.instagram.com/reel/…",
  },
  {
    id: "snapchat",
    name: "Snapchat",
    disclosure: "Paid partnership tag",
    hosts: ["snapchat.com"],
    example: "https://www.snapchat.com/spotlight/…",
  },
];

export const campaignPlatformById = Object.fromEntries(
  campaignPlatforms.map((p) => [p.id, p]),
) as Record<CampaignPlatformId, (typeof campaignPlatforms)[number]>;

/* -------------------------------------------------------------------------- */
/* Status labels (always paired with an icon in <StatusBadge>)                 */
/* -------------------------------------------------------------------------- */

/**
 * Chip looks for a status (see `Badge`): neutral = waiting on someone, active = moving, success =
 * done, warning = needs attention, danger = negative or closed. `info`, `ink` and `neon` are for
 * non-status labels.
 */
export type Tone = "neutral" | "active" | "success" | "warning" | "danger" | "info" | "ink" | "neon";

/**
 * `tone` is the look without a side; `toneFor` overrides it for the side that has to act (a
 * delivery needs the business, requested changes need the creator).
 */
export const commissionStatus: Record<
  CommissionStatus,
  { label: string; business: string; creator: string; tone: Tone; toneFor?: Partial<Record<Role, Tone>> }
> = {
  offered: {
    label: "Offer sent",
    business: "Waiting for the creator to accept",
    creator: "New offer — accept or decline",
    tone: "neutral",
  },
  in_progress: {
    label: "In production",
    business: "The creator is working on it",
    creator: "Make and deliver the first version",
    tone: "active",
  },
  delivered: {
    label: "Ready for review",
    business: "Review the delivery and approve or ask for changes",
    creator: "Waiting for the client's review",
    tone: "warning",
    toneFor: { creator: "neutral" },
  },
  revision: {
    label: "Changes requested",
    business: "The creator is working on your changes",
    creator: "Make the requested changes",
    tone: "active",
    toneFor: { creator: "warning" },
  },
  completed: {
    label: "Completed",
    business: "Approved and paid",
    creator: "Approved and paid",
    tone: "success",
  },
  declined: {
    label: "Declined",
    business: "The creator declined this offer",
    creator: "You declined this offer",
    tone: "danger",
  },
  cancelled: {
    label: "Cancelled",
    business: "Cancelled and refunded",
    creator: "Cancelled",
    tone: "danger",
  },
  disputed: {
    label: "In resolution",
    business: "Our team is helping resolve this",
    creator: "Our team is helping resolve this",
    tone: "danger",
  },
};

/** Custom orders. A campaign's "open" reads "Open" (it takes picks, not pitches). */
export const requestStatus: Record<RequestStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  open: { label: "Open for pitches", tone: "active" },
  hired: { label: "Hired", tone: "success" },
  closed: { label: "Closed", tone: "danger" },
};

export const pitchStatus: Record<PitchStatus, { label: string; tone: Tone }> = {
  sent: { label: "Sent", tone: "neutral" },
  viewed: { label: "Viewed", tone: "neutral" },
  shortlisted: { label: "Shortlisted", tone: "active" },
  declined: { label: "Not selected", tone: "danger" },
  hired: { label: "Hired", tone: "success" },
  withdrawn: { label: "Withdrawn", tone: "danger" },
};

/** Icons used for trust signals across the product. */
export const trustIcons = { verified: BadgeCheck, onTime: Clock };
