/**
 * Domain model for Yapp, a marketplace where businesses commission creators to make social
 * video content for the business's own accounts and ads.
 *
 * Vocabulary (interface names in brackets)
 * - Content request ["Custom order"]: a business describes product, audience, desired content,
 *   budget, deadline; creators pitch. A `ContentRequest` with `kind: "campaign"` is a ["UGC
 *   campaign"]: many creators each pick a slot ("Pick now").
 * - Job type: a video, or written ad copy (custom orders only). See `JobType`.
 * - Pitch: a creator's response to a request (message, quote, relevant samples).
 * - Commission: agreed work between one business and one creator (from a hired pitch, a direct
 *   offer from the creator's profile, or a repeat of a previous commission).
 * - Delivery: a versioned video upload on a commission; the business approves or asks for changes.
 *
 * All timestamps are ISO strings. The demo clock is fixed (see lib/format.ts `NOW`).
 * All money is US dollars. Prices are whole dollars and are always the listed price, what the brand
 * pays. Yapp keeps 20% of every transaction, deducted from what the creator is paid, so a creator's
 * net can carry cents ($157 → $125.60). The split is computed in one place: `priceBreakdown()` in
 * lib/format.ts.
 */

/**
 * A side of a deal: the one ordering ("business") or the one making ("creator"). Since every
 * account can do both, this is never an account type: it is derived per order, commission or
 * thread (`sideOf` in lib/selectors.ts).
 */
export type Role = "business" | "creator";

/* -------------------------------------------------------------------------- */
/* Accounts (one account type: everyone can order and make)                    */
/* -------------------------------------------------------------------------- */

/**
 * A person's account. Every account can order (through its buyer profile, `businessId`) and can
 * make videos once it has a creator profile (`creatorId`). A "business" account adds company
 * details, tax invoices and a team to the buyer profile; a "personal" one orders in its own name.
 */
export type Account = {
  id: string;
  name: string;
  firstName: string;
  email: string;
  kind: "personal" | "business";
  /** Buyer profile used when this account orders (company or personal). */
  businessId: string;
  /** Team member record (business accounts). */
  memberId?: string;
  /** Creator profile, once set up. */
  creatorId?: string;
  /** Id and handle a creator profile created in the browser gets (pre-rendered on Pages). */
  reserved: { creatorId: string; handle: string };
};

/** Illustration tints (characters, avatars, thumbnails; never behind text). */
export type Tint = "violet" | "sun" | "sea" | "coral" | "mint" | "blush";

/* -------------------------------------------------------------------------- */
/* Taxonomy ids (labels live in lib/taxonomy.tsx)                              */
/* -------------------------------------------------------------------------- */

/**
 * What a job produces. "video" covers every format; "ad-copy" is written ad copy, the one non-video
 * job in this version (round 3 answers, item 27). Ad copy is only ever a custom order: never a
 * campaign, no slots, no posting, no follower tier, and no format, platform, length or aspect.
 * Read it with `jobTypeOf()` / `isAdCopy()` in lib/selectors.ts, never from the format.
 */
export type JobType = "video" | "ad-copy";

/**
 * Video formats, plus "ad-copy": the format slot of an ad-copy brief (so any screen that prints a
 * format says "Ad copy writing" instead of a video format). "ad-copy" is never in the `formats`
 * list of lib/taxonomy.tsx, so pickers and the format filter only ever offer video formats.
 */
export type FormatId =
  | "app-demo"
  | "screen-walkthrough"
  | "unboxing"
  | "problem-solution"
  | "comparison"
  | "testimonial"
  | "talking-head"
  | "voiceover"
  | "hook-pack"
  | "ad-copy";

/**
 * Where the brand will run a custom order's video (and where a creator makes videos for). "meta-ads"
 * is an ad placement, never a place to post: campaigns use `CampaignPlatformId` instead.
 */
export type PlatformId =
  | "tiktok"
  | "instagram"
  | "facebook"
  | "meta-ads"
  | "youtube"
  | "snapchat"
  | "linkedin"
  | "x";

/** The language a video is made in (ISO 639-1 codes, so they double as `lang` attributes). */
export type LanguageId = "en" | "es" | "fr" | "ar" | "pt" | "hi" | "ko" | "zh";

export type Aspect = "9:16" | "1:1" | "4:5" | "16:9";

export type CreatorKind = "presenter" | "producer" | "influencer";

/** Product categories (labels in lib/taxonomy.tsx). */
export type NicheId =
  | "ai"
  | "consumer"
  | "b2b"
  | "fintech"
  | "gadgets"
  | "gaming"
  | "health"
  | "ecommerce";

/**
 * Priced extras on a custom or direct order. Usage rights are not an add-on (the brand picks a
 * `UsageOptionId` on every order, included in the price) and raw footage comes with every approved
 * video.
 */
export type AddonId = "extra-revision" | "subtitles" | "rush" | "extra-hooks" | "post-to-account";

/**
 * How the brand may use the videos, chosen on every order (custom orders, direct orders and
 * campaigns) and included in the price. Labels in lib/taxonomy.tsx (`usageOptions`).
 */
export type UsageOptionId = "ads-12m" | "ads-6m" | "organic" | "ads-forever";

export type CountryId = "us" | "ca" | "br" | "eg" | "ng" | "sa" | "ae" | "gb";

export type City = { id: string; name: string; countryId: CountryId };

/* -------------------------------------------------------------------------- */
/* Video (portfolio pieces and deliveries)                                     */
/* -------------------------------------------------------------------------- */

export type Beat = "hook" | "problem" | "demo" | "proof" | "cta";

/** Thumbnail composition used by <VideoThumb>. */
export type Scene = "selfie" | "screen" | "split" | "desk" | "street";

export type ScriptLine = {
  /** Seconds from start. First line is at 0; lines are ascending. */
  at: number;
  /** Caption in the video's own language. */
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
  /** Nobody on camera although the format usually shows someone: the thumbnail draws a microphone, not a face. */
  voiceOnly?: boolean;
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

/** Platforms a campaign can be posted on (read-only account connection + verification). */
export type CampaignPlatformId = "tiktok" | "instagram" | "snapchat";

/** A creator's own social account, connected read-only so real followers can be verified. */
export type SocialAccount = {
  platform: CampaignPlatformId;
  handle: string;
  /** Real followers after verification (bots and inactive accounts removed). */
  followers: number;
  verified: boolean;
  connectedAt: string;
};

export type Creator = {
  id: string;
  handle: string;
  name: string;
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
  /** Only set for creators who offer posting to their own audience (display only). */
  followers?: number;
  /** Connected social accounts; campaign eligibility reads these, never `followers`. */
  socials?: SocialAccount[];
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

/**
 * How a brand treats creators, computed by the platform from its history on Yapp (seeded here, as
 * the store only holds recent work). Creators see these five figures instead of a star rating: their
 * feedback about a brand is private (round 3 answers, item 20). `null` = not enough data yet, shown
 * as "—". Format them with `reliabilityFigures()` in lib/selectors.ts.
 */
export type BrandReliability = {
  /** Share of orders where the money was held on time (at hire or posting) and released without a dispute. */
  paysOnTimePct: number | null;
  /** Median hours from a delivered version to the brand's approval or change request. */
  reviewHours: number | null;
  /** Share of the brand's closed custom orders that ended in a hire. */
  hireRatePct: number | null;
  /** Share of versions approved by the 3-day timer because the brand didn't respond (lower is better). */
  timerApprovedPct: number | null;
  /** Whether the brand shares results with its creators. Needs connected ad accounts, which don't exist yet: always null. */
  sharesResults: null;
};

export type Business = {
  id: string;
  /** "personal": someone ordering in their own name (shows their face, not a logo). */
  kind?: "company" | "personal";
  /** Personal buyer profiles: whose face to show (an id for <FaceAvatar>). */
  faceId?: string;
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
  /** Undefined until the brand has reviewed work on Yapp (every figure then shows "—"). */
  reliability?: BrandReliability;
  website: string;
  /**
   * The brand's own accounts creators must tag on a campaign, one per platform. Saved once (the
   * campaign form saves what it posts with), so the next order starts filled in; change one with
   * `actions.saveBrandHandle`. Each starts with "@".
   */
  handles?: Partial<Record<CampaignPlatformId, string>>;
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

/**
 * A file the brand attaches to a brief to help creators get it right (simulated: name, kind, size
 * and duration only, no real upload). Limits in lib/taxonomy.tsx (`BRIEF_ATTACHMENT_LIMITS`), checked
 * by `checkBriefAttachments()` in lib/files.ts: documents, one reference video of at most 20 seconds,
 * up to ten images, each at most 10 MB.
 */
export type BriefAttachment = {
  id: string;
  kind: "document" | "video" | "image";
  name: string;
  bytes: number;
  /** Reference video only. */
  durationSec?: number;
};

/** What an ad-copy job asks for (custom orders with `jobType: "ad-copy"`). */
export type AdCopySpec = {
  /** What to write, one line each: "5 headlines, up to 40 characters". */
  pieces: string[];
  /** Where the brand will run the copy (ad placements; the creator never posts it). */
  placements: PlatformId[];
};

/**
 * What should be made. Shared by requests and commissions (a hire copies the order's brief, so the
 * job type travels with it).
 *
 * Ad copy (`jobType: "ad-copy"`): `format` is "ad-copy", `platforms` is empty, and `aspect`,
 * `durationSec`, `onCamera` and `languages` beyond the first carry no meaning; read `copy` instead.
 * Always branch with `isAdCopy()` rather than on these fields.
 */
export type Brief = {
  productId: string;
  /** Absent = "video". */
  jobType?: JobType;
  format: FormatId;
  platforms: PlatformId[];
  languages: LanguageId[];
  aspect: Aspect;
  videoCount: number;
  durationSec: number;
  /** The opening: what happens in the first two seconds (ad copy: the opening line). */
  hook?: string;
  /** Ad copy only: what to write and where it runs. */
  copy?: AdCopySpec;
  /** Files from the brand, visible to creators before they pick or pitch. */
  attachments?: BriefAttachment[];
  audience: string;
  /** What viewers should do or feel; the objective. */
  goal: string;
  keyMessage: string;
  mustInclude: string[];
  avoid: string[];
  references: Reference[];
  onCamera: boolean;
  /** How the brand may use the videos; part of the price. Creators see it before they pitch or pick. */
  usage: UsageOptionId;
  /** Add-ons the business wants included in quotes. */
  addons: AddonId[];
  notes?: string;
};

export type RequestStatus = "draft" | "open" | "hired" | "closed";

/**
 * Follower tiers decide who may pick a slot on a UGC campaign (lib/taxonomy.tsx). They carry no
 * price: the brand sets it, with guidance from lib/pricing.ts.
 */
export type FollowerTierId = "t10" | "t20" | "t50" | "t100" | "t250";

/**
 * One money movement on a campaign's card: a charge, a top-up or a refund. Amounts are listed
 * prices: nothing is added for Yapp (its 20% comes out of each creator's pay when a slot is
 * released), and a refund returns exactly what was paid for those slots.
 */
export type LedgerEntry = {
  id: string;
  at: string;
  kind: "charge" | "top_up" | "refund";
  /** What moved on the card. */
  amount: number;
  note: string;
};

/**
 * UGC campaign terms. The business buys `slots` videos (min 10, steps of 5), each from a different
 * creator, at a price per Yapp it sets ($30 to $5,000). The full amount (slots × price) is charged
 * when the campaign is posted and held; each slot is paid out after its video is approved (7 days
 * after the post is verified) and unpicked slots are refunded when it closes. Eligible creators take
 * slots first come, first served. Each taken slot is a Commission with `source: "campaign"` and
 * `campaignSlot`.
 */
export type CampaignTerms = {
  tierId: FollowerTierId;
  /**
   * Listed price per Yapp for slots taken from now on, set by the brand. After posting it can be
   * raised (a top-up for the unpicked slots is held), never lowered. Taken slots keep their price.
   */
  pricePerVideo: number;
  /**
   * Where creators may post, one or more of the platforms a creator can connect and verify. Each
   * creator posts on one of them, chosen when they pick a slot (`Commission.postPlatform`);
   * eligibility and the post-link check use that one.
   */
  platforms: CampaignPlatformId[];
  /**
   * The brand's account to tag on each listed platform (shown to creators; allowed through masking).
   * Read with `brandHandleFor(terms, platform)`.
   */
  brandHandles: Partial<Record<CampaignPlatformId, string>>;
  /* Talking points and restrictions live on the brief (`mustInclude` / `avoid`). */
  /** Explainer video about the product (a seeded or simulated upload). */
  explainer?: { name: string; videoId?: string; durationSec: number };
  /** Days a creator has to upload version 1 after taking a slot. Set by the brand, fixed once posted. */
  deadlineDays: number;
  /**
   * When the campaign stops taking creators (14 days after posting) unless the brand closes it
   * earlier. The demo clock is fixed, so nothing closes by itself; closing is the brand's action.
   * Always the same as the order's own `ContentRequest.closesAt`.
   */
  closesAt: string;
  /** Set when the tier was changed after publishing (allowed once; no money moves). */
  tierChangedAt?: string;
  previousTierId?: FollowerTierId;
  /** Set when the brand raised the price after posting (the price it was posted at). */
  postedPrice?: number;
  /** Card the budget is held on. */
  paymentMethodId: string;
  /** Money movements on the campaign hold. Held = charges + top-ups - refunds - released. */
  ledger: LedgerEntry[];
  /** Creators removed or rejected on this campaign can't take a slot again. */
  excludedCreatorIds: string[];
  /** Runtime campaigns get simulated creators joining; seeded ones never fill up. */
  simulate?: boolean;
};
/**
 * An order a brand posts: a custom order ("custom": creators pitch, the brand picks one) or a UGC
 * campaign ("campaign": many creators pick slots). Interface copy calls them "Custom order" and
 * "UGC campaign" (round 3 answers, item 18); the type keeps its old name.
 */
export type ContentRequest = {
  id: string;
  businessId: string;
  title: string;
  brief: Brief;
  budget: { min: number; max: number };
  /** The latest a hired creator would deliver (custom orders with `deadlineDays`: closing date + deadline). */
  dueDate: string;
  postedAt: string;
  /**
   * When the order stops taking pitches or picks: 14 days after posting (`ORDER_OPEN_DAYS`), unless
   * the brand closes it sooner. Shown, never enforced (the demo clock is fixed).
   */
  closesAt: string;
  status: RequestStatus;
  visibility: "public" | "invite";
  invitedCreatorIds: string[];
  preferredKinds: CreatorKind[];
  /** How many creators the business plans to hire (usually 1). Campaigns: number of videos. */
  slots: number;
  views: number;
  /** Absent = a custom order (creators pitch, the business picks). */
  kind?: "custom" | "campaign";
  /**
   * Custom orders: days the hired creator has to deliver version 1, set by the brand (2, 3, 5, 7 or
   * 10; `ORDER_DEADLINE_OPTIONS`). Absent on older orders, where the pitch names its own days.
   * Campaigns keep theirs on `campaign.deadlineDays`; read either with `deadlineDaysOf()`.
   */
  deadlineDays?: number;
  campaign?: CampaignTerms;
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
  | "due_changed"
  | "slot_accepted"
  | "creator_replaced"
  | "video_rejected"
  | "posted"
  | "post_verified"
  | "payout_available";

export type CommissionEvent = {
  id: string;
  at: string;
  kind: CommissionEventKind;
  actor: Role | "system";
  text: string;
};

/**
 * A reply under a delivery comment (one level deep: replies have no replies). Same rules as the
 * comment: the author can edit or delete it on the latest version while comments are open.
 */
export type CommentReply = {
  id: string;
  author: Role;
  /**
   * Who wrote it, for a name and a face: a team member id (business side, when the account has
   * one), the buyer profile id (business side otherwise), or the creator id (creator side). Resolve
   * with `commentAuthor()` in lib/selectors.ts.
   */
  authorId: string;
  text: string;
  createdAt: string;
  editedAt?: string;
  /** Soft delete: kept for support and disputes, shown as "Comment deleted". */
  deletedAt?: string;
  /** The other side hasn't seen it yet (cleared by `actions.markCommentsRead`). */
  unread?: boolean;
};

/**
 * A comment on one delivered version, private to the two sides (Site-wide spec 5.5.4, round 3
 * answers G1). Either side can comment on any version while the order is open and for 30 days after
 * completion (`commentsOpen()`), then comments are read-only. Comments never stop the review timer.
 */
export type DeliveryComment = {
  id: string;
  /** Seconds into the video, or null for a general comment on the whole version (ad copy: always null). */
  atSec: number | null;
  text: string;
  author: Role;
  /** Who wrote it (see `CommentReply.authorId`). */
  authorId: string;
  /** Either side can resolve; only the business can re-open. */
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: Role;
  createdAt: string;
  editedAt?: string;
  /** Soft delete: kept for support and disputes, shown as "Comment deleted". */
  deletedAt?: string;
  /** Sent to the creator as part of a change request (ticked in "Request changes"). */
  requestedAt?: string;
  /** The other side hasn't seen it yet (cleared by `actions.markCommentsRead`). */
  unread?: boolean;
  replies: CommentReply[];
};

/** A file on a delivery. `kind` is absent on older video deliveries. */
export type DeliveryFile = {
  name: string;
  size: string;
  kind?: "video" | "document" | "subtitles" | "image" | "archive";
};

/**
 * One delivered version. Video jobs carry `video`; ad copy (`kind: "text"`) carries the copy as
 * `text` and/or documents in `files` (PDF, DOC, DOCX, TXT), and has no video.
 */
export type Delivery = {
  id: string;
  version: number;
  /** Absent = "video". */
  kind?: "video" | "text";
  /** Video deliveries only. */
  video?: Video;
  /** Text deliveries: the copy, as typed into the delivery sheet. */
  text?: string;
  note: string;
  deliveredAt: string;
  status: "in_review" | "changes_requested" | "approved" | "rejected";
  comments: DeliveryComment[];
  files: DeliveryFile[];
  /** Campaign review copy: watermarked and low quality until approved. */
  reviewCopy?: boolean;
};

/**
 * - authorized: card authorized for a direct offer, not charged until the creator accepts
 * - held: charged and held, released on approval (campaign slots: while the creator works)
 * - pending: approved campaign work, still held: released 7 days after the creator's post is
 *   verified (`withdrawableFrom`), if the post is still live
 * - released: paid to the creator, less Yapp's fee (available to withdraw)
 * - refunded: back to the business in full (the price it paid)
 * - returned: a campaign slot that ended without being paid; the money went back to the campaign hold
 */
export type PaymentStatus = "authorized" | "held" | "pending" | "released" | "refunded" | "returned";

/** The creator's post of an approved campaign video on their own account. */
export type CampaignPost = {
  status: "due" | "checking" | "live" | "removed";
  url?: string;
  at?: string;
  /** First verification: starts the 7 days to payment and the 30 days the post must stay up. */
  verifiedAt?: string;
  /** When the post was found down (the creator has 48 hours to restore it). */
  removedAt?: string;
  /** What verification found (tag and paid-partnership disclosure). */
  tagFound?: boolean;
  disclosureFound?: boolean;
};

export type Commission = {
  id: string;
  businessId: string;
  creatorId: string;
  title: string;
  brief: Brief;
  source: "request" | "direct" | "repeat" | "campaign";
  requestId?: string;
  pitchId?: string;
  packageId?: string;
  previousCommissionId?: string;
  /**
   * Listed price for the work itself, what the brand pays (add-ons on top of it). Charged at hire
   * (campaign slots: with the campaign) and held; refunds return it in full.
   */
  price: number;
  addons: { id: AddonId; price: number }[];
  /**
   * Yapp's share of the total (price + add-ons), deducted from what the creator is paid and never
   * added to the brand's price. Fixed when the order is placed, so a fee change never applies to an
   * open order or a picked slot. The split: `priceBreakdown()` in lib/format.ts.
   */
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
  /** Campaign slots: which slot (1-based) this commission fills. */
  campaignSlot?: number;
  /**
   * Campaign slots: the one platform this creator posts on, chosen when picking from the campaign's
   * `platforms`. Read with `slotPlatform()` (older slots fall back to the campaign's first platform).
   */
  postPlatform?: CampaignPlatformId;
  /** Campaign slots: the creator's post on their own account. */
  post?: CampaignPost;
  /**
   * Campaign slots: when pending money is released (7 days after the post is verified), if the post
   * is still live. Unset until the post is verified.
   */
  withdrawableFrom?: string;
  /** Why a campaign slot ended without being paid. */
  cancelCode?: "replaced" | "video_rejected" | "campaign_closed" | "post_removed";
  /** Campaign slots: quick star rating from the business on approval. */
  quickRating?: number;
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
  /**
   * Repeated system lines with the same key merge into the last one instead of stacking ("4 new
   * comments on Version 1"); `count` says how many it stands for.
   */
  group?: string;
  count?: number;
  /** System lines about comments: the version they're on, so the thread can link back ("View"). */
  link?: { kind: "comments"; commissionId: string; deliveryId: string; version: number };
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
  /** A comment or reply on a delivered version. */
  | "comment"
  | "offer"
  | "payment"
  | "review"
  | "request"
  | "revision"
  | "campaign"
  | "system";

export type Notification = {
  id: string;
  /** The account this is for. */
  accountId: string;
  kind: NotificationKind;
  text: string;
  href: string;
  at: string;
  unread: boolean;
  /** Repeated events (e.g. creators joining a campaign) merge into one unread notification. */
  groupKey?: string;
  count?: number;
};

/* -------------------------------------------------------------------------- */
/* Money                                                                       */
/* -------------------------------------------------------------------------- */

export type PaymentMethod = {
  id: string;
  /** Buyer profile the card belongs to. */
  businessId: string;
  brand: "visa" | "mastercard" | "amex" | "applepay";
  last4: string;
  expiry: string;
  holder: string;
  isDefault: boolean;
};

export type PayoutMethod = {
  id: string;
  creatorId: string;
  kind: "bank" | "wallet";
  label: string;
  detail: string;
  isDefault: boolean;
};

export type Payout = {
  id: string;
  creatorId: string;
  amount: number;
  status: "processing" | "paid";
  methodId: string;
  at: string;
  /**
   * Seed only: the commissions this payout paid out, so their earnings don't count as available
   * again. Seeded payouts without it stand for work from before the seed window.
   */
  commissionIds?: string[];
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
