import {
  BadgeCheck,
  Banknote,
  Captions,
  Clapperboard,
  Clock,
  Film,
  GraduationCap,
  Layers,
  type LucideIcon,
  Megaphone,
  MessageSquareQuote,
  MonitorPlay,
  Repeat2,
  Scissors,
  Smartphone,
  Video,
  Zap,
} from "lucide-react";

import type {
  AddonId,
  Aspect,
  CommissionStatus,
  CountryId,
  CreatorKind,
  FormatId,
  LanguageId,
  NicheId,
  PitchStatus,
  PlatformId,
  RequestStatus,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Content formats: the manageable launch set, tuned for software demos.       */
/* -------------------------------------------------------------------------- */

export type FormatInfo = {
  id: FormatId;
  name: string;
  short: string;
  description: string;
  /** Typical length range in seconds. */
  typical: [number, number];
  icon: LucideIcon;
  /** Example structure shown in briefs and on the landing page. */
  beats: string[];
};

export const formats: FormatInfo[] = [
  {
    id: "selfie-demo",
    name: "Selfie demo",
    short: "Talk to camera, then show the app",
    description:
      "A creator films themselves explaining a relatable problem, demos your app on their phone, and tells viewers to try it.",
    typical: [30, 60],
    icon: Smartphone,
    beats: ["Relatable hook", "The problem", "Phone demo", "Try it today"],
  },
  {
    id: "screen-walkthrough",
    name: "Screen walkthrough",
    short: "Voiceover over a clean screen recording",
    description:
      "A tidy screen recording of your product with a natural voiceover. No face required, great for features and onboarding.",
    typical: [45, 120],
    icon: MonitorPlay,
    beats: ["What you'll learn", "Step by step", "The result", "Where to start"],
  },
  {
    id: "ugc-review",
    name: "Honest review",
    short: "Why they switched and what they love",
    description:
      "A real-feeling testimonial: the creator shares how they used your product and what changed. Built for trust.",
    typical: [20, 45],
    icon: MessageSquareQuote,
    beats: ["Before", "What I tried", "What changed", "My verdict"],
  },
  {
    id: "problem-skit",
    name: "Problem skit",
    short: "A short, funny sketch about the pain",
    description:
      "A quick sketch that dramatises the everyday problem your app removes, ending with the app saving the day.",
    typical: [15, 40],
    icon: Clapperboard,
    beats: ["The situation", "It gets worse", "The fix", "Punchline + CTA"],
  },
  {
    id: "tutorial",
    name: "How-to tutorial",
    short: "Step-by-step guide to one workflow",
    description:
      "A friendly, step-by-step guide to one feature or workflow, filmed so viewers can follow along.",
    typical: [60, 180],
    icon: GraduationCap,
    beats: ["Goal", "Steps", "Tips", "Recap"],
  },
  {
    id: "hook-pack",
    name: "Ad hook pack",
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
/* Languages and dialects                                                      */
/* -------------------------------------------------------------------------- */

export const languages: {
  id: LanguageId;
  name: string;
  short: string;
  native: string;
  region: string;
}[] = [
  { id: "ar-saudi", name: "Saudi Arabic", short: "Saudi", native: "سعودي", region: "Saudi Arabia" },
  {
    id: "ar-gulf",
    name: "Gulf Arabic (Khaleeji)",
    short: "Khaleeji",
    native: "خليجي",
    region: "UAE, Kuwait, Qatar, Bahrain, Oman",
  },
  {
    id: "ar-egyptian",
    name: "Egyptian Arabic",
    short: "Egyptian",
    native: "مصري",
    region: "Egypt",
  },
  {
    id: "ar-levantine",
    name: "Levantine Arabic",
    short: "Levantine",
    native: "شامي",
    region: "Jordan, Lebanon, Syria, Palestine",
  },
  { id: "ar-iraqi", name: "Iraqi Arabic", short: "Iraqi", native: "عراقي", region: "Iraq" },
  {
    id: "ar-maghrebi",
    name: "Maghrebi Arabic (Darija)",
    short: "Darija",
    native: "دارجة",
    region: "Morocco, Algeria, Tunisia",
  },
  {
    id: "ar-msa",
    name: "Modern Standard Arabic",
    short: "Fusha",
    native: "فصحى",
    region: "Pan-Arab, formal",
  },
  { id: "en", name: "English", short: "English", native: "English", region: "Global" },
];

export const languageById = Object.fromEntries(languages.map((l) => [l.id, l])) as Record<
  LanguageId,
  (typeof languages)[number]
>;

export const isArabic = (id: LanguageId) => id !== "en";

/* -------------------------------------------------------------------------- */
/* Niches                                                                      */
/* -------------------------------------------------------------------------- */

export const niches: { id: NicheId; name: string }[] = [
  { id: "fintech", name: "Fintech" },
  { id: "productivity", name: "Productivity" },
  { id: "ecommerce", name: "E-commerce" },
  { id: "edtech", name: "Education" },
  { id: "health", name: "Health & fitness" },
  { id: "ai", name: "AI tools" },
  { id: "b2b", name: "B2B & SaaS" },
  { id: "consumer", name: "Consumer apps" },
  { id: "gaming", name: "Gaming" },
  { id: "travel", name: "Travel" },
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
    description: "Arabic and English captions styled for silent autoplay.",
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

export const countries: Record<CountryId, { name: string; flag: string }> = {
  sa: { name: "Saudi Arabia", flag: "SA" },
  ae: { name: "UAE", flag: "AE" },
  eg: { name: "Egypt", flag: "EG" },
  jo: { name: "Jordan", flag: "JO" },
  lb: { name: "Lebanon", flag: "LB" },
  iq: { name: "Iraq", flag: "IQ" },
  kw: { name: "Kuwait", flag: "KW" },
  qa: { name: "Qatar", flag: "QA" },
  ma: { name: "Morocco", flag: "MA" },
  bh: { name: "Bahrain", flag: "BH" },
  om: { name: "Oman", flag: "OM" },
};

/** Platform economics. */
export const SERVICE_FEE_RATE = 0.1;
export const AUTO_APPROVE_DAYS = 3;

/* -------------------------------------------------------------------------- */
/* Status labels (always paired with an icon in <StatusBadge>)                 */
/* -------------------------------------------------------------------------- */

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "ink" | "neon";

export const commissionStatus: Record<
  CommissionStatus,
  { label: string; business: string; creator: string; tone: Tone }
> = {
  offered: {
    label: "Offer sent",
    business: "Waiting for the creator to accept",
    creator: "New offer — accept or decline",
    tone: "info",
  },
  in_progress: {
    label: "In production",
    business: "The creator is working on it",
    creator: "Make and deliver the first version",
    tone: "neutral",
  },
  delivered: {
    label: "Ready for review",
    business: "Review the delivery and approve or ask for changes",
    creator: "Waiting for the client's review",
    tone: "warning",
  },
  revision: {
    label: "Changes requested",
    business: "The creator is working on your changes",
    creator: "Make the requested changes",
    tone: "warning",
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
    tone: "neutral",
  },
  cancelled: {
    label: "Cancelled",
    business: "Cancelled and refunded",
    creator: "Cancelled",
    tone: "neutral",
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
  open: { label: "Open for pitches", tone: "success" },
  hired: { label: "Hired", tone: "ink" },
  closed: { label: "Closed", tone: "neutral" },
};

export const pitchStatus: Record<PitchStatus, { label: string; tone: Tone }> = {
  sent: { label: "Sent", tone: "neutral" },
  viewed: { label: "Viewed", tone: "info" },
  shortlisted: { label: "Shortlisted", tone: "success" },
  declined: { label: "Not selected", tone: "neutral" },
  hired: { label: "Hired", tone: "ink" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
};

/** Icons used for trust signals across the product. */
export const trustIcons = { verified: BadgeCheck, onTime: Clock };
