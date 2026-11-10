import {
  ArrowLeftRight,
  BadgeCheck,
  Banknote,
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
  Scissors,
  Smartphone,
  Speech,
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
  LanguageId,
  NicheId,
  PitchStatus,
  PlatformId,
  RequestStatus,
  Role,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Content formats: the launch set, tuned for tech products.                  */
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

export const formatById = Object.fromEntries(formats.map((f) => [f.id, f])) as Record<
  FormatId,
  FormatInfo
>;

/* -------------------------------------------------------------------------- */
/* Platforms                                                                   */
/* -------------------------------------------------------------------------- */

export const platforms: { id: PlatformId; name: string; short: string }[] = [
  { id: "tiktok", name: "TikTok", short: "TikTok" },
  { id: "instagram", name: "Instagram Reels", short: "Reels" },
  { id: "youtube", name: "YouTube Shorts", short: "Shorts" },
  { id: "snapchat", name: "Snapchat", short: "Snap" },
  { id: "x", name: "X", short: "X" },
  { id: "linkedin", name: "LinkedIn", short: "LinkedIn" },
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
    id: "raw-footage",
    name: "Raw footage",
    description: "All unedited clips so your team can recut later.",
    icon: Scissors,
  },
  {
    id: "subtitles",
    name: "Burned-in subtitles",
    description: "Captions in the video's language, styled for silent autoplay.",
    icon: Captions,
  },
  {
    id: "ad-rights-90",
    name: "Paid ads usage · 90 days",
    description: "Run the video as a paid ad for 90 days.",
    icon: Banknote,
  },
  {
    id: "ad-rights-365",
    name: "Paid ads usage · 12 months",
    description: "Run the video as a paid ad for a full year.",
    icon: Banknote,
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

/** Always included in every commission (shown as "included" in summaries). */
export const includedRights =
  "Organic use on your own accounts, forever. You own the final files.";

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
 * Platform economics (the legal pack's numbers table). The business pays the service fee on top of
 * the creator's price; it is charged with the payment (at hire, or when a campaign is posted), held
 * with it, and refunded with it (in full, or in the same proportion as a partial refund).
 */
export const SERVICE_FEE_RATE = 0.1;
export const AUTO_APPROVE_DAYS = 3;

/** Price limits per Yapp (one video): packages, pitches and campaign tiers stay inside them. */
export const PRICE_MIN_PER_YAPP = 30;
export const PRICE_MAX_PER_YAPP = 5_000;
/** The lowest price a pitch can name. */
export const PITCH_MIN = 30;

/* -------------------------------------------------------------------------- */
/* UGC campaigns (PM spec "UGC Campaign Flow", legal pack Brand Terms §3–7)    */
/* -------------------------------------------------------------------------- */

/** Campaigns carry the same 10% fee: charged with the budget when the campaign is posted. */
export const CAMPAIGN_FEE_RATE = 0.1;
/** Minimum videos per campaign, each from a different creator. */
export const CAMPAIGN_MIN_VIDEOS = 10;
/** Video counts go up in steps of 5: 10, 15, 20, … */
export const CAMPAIGN_STEP = 5;
export const CAMPAIGN_MAX_VIDEOS = 50;

/** Days the brand can give a creator to upload version 1 after taking a slot (fixed once posted). */
export const CAMPAIGN_DEADLINE_OPTIONS = [2, 3, 5, 7, 10] as const;
export const CAMPAIGN_DEADLINE_DEFAULT = 5;
/** A campaign stays open for this many days unless the brand closes it earlier. */
export const CAMPAIGN_OPEN_DAYS = 14;
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
  pricePerVideo: number;
  /** Tiers the PM hasn't confirmed yet (same pattern, prices to be defined). */
  placeholder?: boolean;
};

/** The business picks a tier; the tier sets the price per video (inside the per-Yapp limits). */
export const followerTiers: FollowerTier[] = [
  { id: "t10", min: 10_000, max: 20_000, label: "10K–20K", pricePerVideo: 30 },
  { id: "t20", min: 20_000, max: 50_000, label: "20K–50K", pricePerVideo: 40 },
  { id: "t50", min: 50_000, max: 100_000, label: "50K–100K", pricePerVideo: 50, placeholder: true },
  { id: "t100", min: 100_000, max: 250_000, label: "100K–250K", pricePerVideo: 60, placeholder: true },
  { id: "t250", min: 250_000, max: Number.POSITIVE_INFINITY, label: "250K+", pricePerVideo: 75, placeholder: true },
];

export const tierById = Object.fromEntries(followerTiers.map((t) => [t.id, t])) as Record<
  FollowerTierId,
  FollowerTier
>;

export const tierFor = (followers: number) =>
  followerTiers.find((t) => followers >= t.min && followers < t.max);

/** Where a campaign video gets posted (the brand account to tag lives there too). */
export const campaignPlatforms: { id: CampaignPlatformId; name: string; disclosure: string }[] = [
  { id: "tiktok", name: "TikTok", disclosure: "Paid partnership label (Content disclosure → Paid partnership)" },
  { id: "instagram", name: "Instagram", disclosure: "Paid partnership label" },
  { id: "snapchat", name: "Snapchat", disclosure: "Paid partnership tag" },
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
