/**
 * Domain model for Yapp, a marketplace where businesses commission creators to make social
 * video content for the business's own accounts and ads.
 *
 * Vocabulary
 * - Content request: a business describes product, audience, desired content, budget, deadline.
 * - Pitch: a creator's response to a request (message, quote, relevant samples).
 * - Commission: agreed work between one business and one creator (from a hired pitch, a direct
 *   offer from the creator's profile, or a repeat of a previous commission).
 * - Delivery: a versioned video upload on a commission; the business approves or asks for changes.
 *
 * All timestamps are ISO strings. The demo clock is fixed (see lib/format.ts `NOW`).
 * All money is whole US dollars.
 */

export type Role = "business" | "creator";

/** Illustration tints (characters, avatars, thumbnails; never behind text). */
export type Tint = "violet" | "sun" | "sea" | "coral" | "mint" | "blush";

/* -------------------------------------------------------------------------- */
/* Taxonomy ids (labels live in lib/taxonomy.tsx)                              */
/* -------------------------------------------------------------------------- */

export type FormatId =
  | "selfie-demo"
  | "screen-walkthrough"
  | "ugc-review"
  | "problem-skit"
  | "tutorial"
  | "hook-pack";

export type PlatformId = "tiktok" | "instagram" | "youtube" | "snapchat" | "x" | "linkedin";

export type LanguageId =
  | "ar-gulf"
  | "ar-saudi"
  | "ar-egyptian"
  | "ar-levantine"
  | "ar-iraqi"
  | "ar-maghrebi"
  | "ar-msa"
  | "en";

export type Aspect = "9:16" | "1:1" | "4:5" | "16:9";

export type CreatorKind = "presenter" | "producer" | "influencer";

export type NicheId =
  | "fintech"
  | "productivity"
  | "ecommerce"
  | "edtech"
  | "health"
  | "ai"
  | "b2b"
  | "consumer"
  | "gaming"
  | "travel";

export type AddonId =
  | "extra-revision"
  | "raw-footage"
  | "subtitles"
  | "ad-rights-90"
  | "ad-rights-365"
  | "rush"
  | "extra-hooks"
  | "post-to-account";

export type CountryId = "sa" | "ae" | "eg" | "jo" | "lb" | "iq" | "kw" | "qa" | "ma" | "bh" | "om";

export type City = { id: string; name: string; nameAr: string; countryId: CountryId };

/* -------------------------------------------------------------------------- */
/* Video (portfolio pieces and deliveries)                                     */
/* -------------------------------------------------------------------------- */

export type Beat = "hook" | "problem" | "demo" | "proof" | "cta";

/** Thumbnail composition used by <VideoThumb>. */
export type Scene = "selfie" | "screen" | "split" | "desk" | "street";

export type ScriptLine = {
  /** Seconds from start. First line is at 0; lines are ascending. */
  at: number;
  /** Caption in the video's own language (Arabic script for Arabic videos). */
  text: string;
  /** English translation, present when the video is not in English. */
  translation?: string;
  beat: Beat;
};

export type Video = {
  id: string;
  creatorId: string;
  /** Internal title shown under the thumbnail, English. */
  title: string;
  /** On-screen hook caption in the video's language. */
  hook: string;
  /** English translation of the hook when `lang` is not "en". */
  hookTranslation?: string;
  lang: LanguageId;
  format: FormatId;
  durationSec: number;
  aspect: Aspect;
  tints: [Tint, Tint];
  scene: Scene;
  niche: NicheId;
  /** Fictional brand the piece was made for; undefined means a spec piece. */
  madeFor?: string;
  /** Performance reported by the client, when shared. */
  stats?: { views: number; watchThroughPct?: number };
  script: ScriptLine[];
};

/* -------------------------------------------------------------------------- */
/* Creators                                                                    */
/* -------------------------------------------------------------------------- */

export type PackageTier = "basic" | "standard" | "premium";

export type Package = {
  id: string;
  tier: PackageTier;
  name: string;
  summary: string;
  price: number;
  deliveryDays: number;
  revisions: number;
  videos: number;
  maxSeconds: number;
  includes: string[];
};

export type CreatorAddon = { id: AddonId; price: number; extraDays?: number };

export type Creator = {
  id: string;
  handle: string;
  name: string;
  nameAr?: string;
  firstName: string;
  kind: CreatorKind;
  cityId: string;
  headline: string;
  bio: string;
  languages: LanguageId[];
  formats: FormatId[];
  niches: NicheId[];
  platforms: PlatformId[];
  rating: number;
  reviewCount: number;
  completed: number;
  /** % of clients who commissioned again. */
  repeatClientRate: number;
  /** % of commissions delivered on or before the due date. */
  onTimeRate: number;
  /** Median first-response time in hours. */
  responseHours: number;
  packages: Package[];
  addons: CreatorAddon[];
  portfolioIds: string[];
  featuredVideoId: string;
  /** Only set for creators who offer posting to their own audience. */
  followers?: number;
  available: boolean;
  /** When unavailable: the date they can start new work. */
  availableFrom?: string;
  verified: boolean;
  topRated: boolean;
  memberSince: string;
  equipment: string[];
  /** Profile accent (gradient pair). */
  tints: [Tint, Tint];
};

/* -------------------------------------------------------------------------- */
/* Businesses and products                                                     */
/* -------------------------------------------------------------------------- */

export type TeamMember = {
  id: string;
  businessId: string;
  name: string;
  title: string;
  email: string;
};

export type Business = {
  id: string;
  name: string;
  monogram: string;
  /** Logo background; white text must stay readable (contrast ≥ 4.5). */
  brandColor: string;
  tagline: string;
  cityId: string;
  industry: NicheId;
  teamSize: string;
  verified: boolean;
  paymentVerified: boolean;
  memberSince: string;
  hires: number;
  /** Average rating given to this business by creators (clarity, responsiveness). */
  clientRating: number;
  website: string;
};

export type ProductAsset = {
  id: string;
  name: string;
  kind: "logo" | "screens" | "demo-account" | "brand-guide" | "footage";
  size: string;
};

/** Feedback that carries forward into later commissions for this product. */
export type Learning = {
  id: string;
  text: string;
  sourceCommissionId?: string;
  creatorId?: string;
  createdAt: string;
};

/** Product context saved once and reused for every request and commission. */
export type Product = {
  id: string;
  businessId: string;
  name: string;
  oneLiner: string;
  description: string;
  website: string;
  niche: NicheId;
  surfaces: ("ios" | "android" | "web")[];
  audience: string;
  problem: string;
  features: string[];
  tone: string[];
  dos: string[];
  donts: string[];
  cta: string;
  brandColor: string;
  assets: ProductAsset[];
  learnings: Learning[];
  updatedAt: string;
};

/* -------------------------------------------------------------------------- */
/* Requests and pitches                                                        */
/* -------------------------------------------------------------------------- */

export type Reference = { id: string; label: string; note?: string };

/** What should be made. Shared by requests and commissions. */
export type Brief = {
  productId: string;
  format: FormatId;
  platforms: PlatformId[];
  languages: LanguageId[];
  aspect: Aspect;
  videoCount: number;
  durationSec: number;
  audience: string;
  /** What viewers should do or feel; the objective. */
  goal: string;
  keyMessage: string;
  mustInclude: string[];
  avoid: string[];
  references: Reference[];
  onCamera: boolean;
  /** Add-ons the business wants included in quotes. */
  addons: AddonId[];
  notes?: string;
};

export type RequestStatus = "draft" | "open" | "hired" | "closed";

export type ContentRequest = {
  id: string;
  businessId: string;
  title: string;
  brief: Brief;
  budget: { min: number; max: number };
  dueDate: string;
  postedAt: string;
  status: RequestStatus;
  visibility: "public" | "invite";
  invitedCreatorIds: string[];
  preferredKinds: CreatorKind[];
  /** How many creators the business plans to hire (usually 1). */
  slots: number;
  views: number;
};

export type PitchStatus = "sent" | "viewed" | "shortlisted" | "declined" | "hired" | "withdrawn";

export type Pitch = {
  id: string;
  requestId: string;
  creatorId: string;
  message: string;
  /** Short proposed concept / opening hook. */
  angle: string;
  price: number;
  deliveryDays: number;
  sampleIds: string[];
  status: PitchStatus;
  sentAt: string;
};

/* -------------------------------------------------------------------------- */
/* Commissions                                                                 */
/* -------------------------------------------------------------------------- */

export type CommissionStatus =
  | "offered" // direct offer waiting for the creator to accept
  | "in_progress"
  | "delivered" // a delivery is waiting for the business's review
  | "revision" // business asked for changes; creator is working on the next version
  | "completed"
  | "declined"
  | "cancelled"
  | "disputed";

export type CommissionEventKind =
  | "offer_sent"
  | "offer_accepted"
  | "offer_declined"
  | "hired"
  | "funded"
  | "brief_updated"
  | "delivered"
  | "revision_requested"
  | "approved"
  | "paid"
  | "reviewed"
  | "cancelled"
  | "disputed"
  | "due_changed";

export type CommissionEvent = {
  id: string;
  at: string;
  kind: CommissionEventKind;
  actor: Role | "system";
  text: string;
};

export type DeliveryComment = {
  id: string;
  atSec: number;
  text: string;
  author: Role;
  resolved: boolean;
  createdAt: string;
};

export type Delivery = {
  id: string;
  version: number;
  video: Video;
  note: string;
  deliveredAt: string;
  status: "in_review" | "changes_requested" | "approved";
  comments: DeliveryComment[];
  files: { name: string; size: string }[];
};

export type PaymentStatus = "authorized" | "held" | "released" | "refunded";

export type Commission = {
  id: string;
  businessId: string;
  creatorId: string;
  title: string;
  brief: Brief;
  source: "request" | "direct" | "repeat";
  requestId?: string;
  pitchId?: string;
  packageId?: string;
  previousCommissionId?: string;
  /** Creator's price for the work itself (creators keep 100% of this). */
  price: number;
  addons: { id: AddonId; price: number }[];
  /** Service fee paid by the business, charged only when the commission completes. */
  feeRate: number;
  revisionsIncluded: number;
  revisionsUsed: number;
  status: CommissionStatus;
  createdAt: string;
  acceptedAt?: string;
  dueDate: string;
  completedAt?: string;
  /** When a delivery is in review: auto-approval date if the business does not respond. */
  autoApproveAt?: string;
  deliveries: Delivery[];
  events: CommissionEvent[];
  threadId: string;
  reviewId?: string;
  /** Private feedback from the creator about the business. */
  clientFeedback?: { rating: number; text: string };
  payment: { status: PaymentStatus; methodId: string };
  /** Message the business attached to a direct offer. */
  offerMessage?: string;
  cancelReason?: string;
};

export type Review = {
  id: string;
  commissionId?: string;
  creatorId: string;
  businessId: string;
  rating: number;
  quality: number;
  communication: number;
  timeliness: number;
  text: string;
  wouldRehire: boolean;
  createdAt: string;
  authorName: string;
  authorTitle: string;
  /** Format of the commission that was reviewed. */
  format: FormatId;
  reply?: string;
};

/* -------------------------------------------------------------------------- */
/* Messages and notifications                                                  */
/* -------------------------------------------------------------------------- */

export type Attachment = {
  kind: "video" | "file" | "image";
  name: string;
  size?: string;
  videoId?: string;
};

export type Message = {
  id: string;
  from: Role | "system";
  text: string;
  at: string;
  attachment?: Attachment;
};

export type Thread = {
  id: string;
  businessId: string;
  creatorId: string;
  commissionId?: string;
  requestId?: string;
  subject: string;
  messages: Message[];
  /** Roles that have unread messages in this thread. */
  unread: Role[];
};

export type NotificationKind =
  | "pitch"
  | "delivery"
  | "message"
  | "offer"
  | "payment"
  | "review"
  | "request"
  | "revision"
  | "system";

export type Notification = {
  id: string;
  role: Role;
  kind: NotificationKind;
  text: string;
  href: string;
  at: string;
  unread: boolean;
};

/* -------------------------------------------------------------------------- */
/* Money                                                                       */
/* -------------------------------------------------------------------------- */

export type PaymentMethod = {
  id: string;
  brand: "visa" | "mastercard" | "mada" | "applepay";
  last4: string;
  expiry: string;
  holder: string;
  isDefault: boolean;
};

export type PayoutMethod = {
  id: string;
  kind: "bank" | "wallet";
  label: string;
  detail: string;
  isDefault: boolean;
};

export type Payout = {
  id: string;
  amount: number;
  status: "processing" | "paid";
  methodId: string;
  at: string;
};

/* -------------------------------------------------------------------------- */
/* Settings                                                                    */
/* -------------------------------------------------------------------------- */

export type NotificationPrefs = {
  email: boolean;
  whatsapp: boolean;
  push: boolean;
  digest: "instant" | "daily" | "off";
};

export type Settings = {
  business: NotificationPrefs & { autoApproveReminders: boolean; invoiceEmail: string };
  creator: NotificationPrefs & {
    matchAlerts: boolean;
    minBudget: number;
    vacationMode: boolean;
  };
};
