/**
 * The Library: everything approved on the signed-in buyer profile's orders, newest first. One item
 * per job (its latest approved version): a video, or for ad-copy jobs (`delivery.kind === "text"`)
 * the copy itself. Campaign slots count too: once approved, the creator's video unlocks at full
 * quality and is posted on their own account. Pure: safe in render.
 *
 * Usage rights come from the order's own option (`brief.usage`, one of four, included in the
 * price); a paid-ads end date counts from approval. Raw footage comes with every approved video.
 */
import { TIME_ZONE } from "@/lib/clock";
import {
  brandHandleFor,
  creatorById,
  isAdCopy,
  isTextDelivery,
  keepLiveUntil,
  me,
  productById,
  requestById,
  slotPlatform,
} from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { campaignPlatformById, usageById } from "@/lib/taxonomy";
import type {
  CampaignPlatformId,
  Commission,
  ContentRequest,
  Creator,
  Delivery,
  DeliveryFile,
  Product,
  UsageOptionId,
  Video,
} from "@/lib/types";

/** Months of paid ads each usage option gives, from approval: null = no end date, 0 = no paid ads. */
const AD_MONTHS: Record<UsageOptionId, number | null> = {
  "ads-12m": 12,
  "ads-6m": 6,
  "ads-forever": null,
  organic: 0,
};

/** "Nov 4, 2027": end dates are often next year, so they carry it. */
const dateWithYear = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});
export const yearDate = (iso: string) => dateWithYear.format(new Date(iso));

/** The same day `months` later (calendar months, UTC; the display offset never crosses a month here). */
function addMonths(iso: string, months: number): string {
  const date = new Date(iso);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString();
}

/** How the brand may use one approved item, from the order's usage option. */
export type Usage = {
  option: UsageOptionId;
  /** "Paid ads · 12 months" */
  name: string;
  /** Paid ads allowed at all. */
  ads: boolean;
  /** When paid-ads use ends (counted from approval); undefined = no end date (or no ads). */
  adsUntil?: string;
  /** Months of paid ads, for "12 months from approval". */
  months?: number;
};

export function usageFor(option: UsageOptionId, approvedAt: string): Usage {
  const months = AD_MONTHS[option];
  return {
    option,
    name: usageById[option].name,
    ads: months !== 0,
    adsUntil: months ? addMonths(approvedAt, months) : undefined,
    months: months ?? undefined,
  };
}

type ItemBase = {
  /** The approved delivery's id (also accepted in `?video=`, as is a video's id). */
  id: string;
  commission: Commission;
  delivery: Delivery;
  creator?: Creator;
  product?: Product;
  approvedAt: string;
  /** Versions delivered on the job, to say "Version 2 of 2". */
  versions: number;
  usage: Usage;
  /** Full-quality files (a campaign review copy's watermark is gone once approved). */
  files: DeliveryFile[];
};

export type VideoItem = ItemBase & {
  kind: "video";
  video: Video;
  /** Campaign slots: where the creator posts it. */
  campaign?: {
    request?: ContentRequest;
    platform: CampaignPlatformId;
    platformName: string;
    /** The creator's handle on that platform. */
    handle?: string;
    /** The brand's account the post tags. */
    brandHandle?: string;
    status: "due" | "checking" | "live" | "removed";
    keepLiveUntil?: string;
  };
};

/** Ad copy writing: the copy as text and/or documents, no video. */
export type CopyItem = ItemBase & {
  kind: "copy";
  /** The copy as typed into the delivery (may be empty when it came as a document only). */
  text: string;
};

export type LibraryItem = VideoItem | CopyItem;

/** When the version was approved: the approval event, else completion, else the upload. */
function approvalTime(c: Commission, d: Delivery): string {
  const approved = [...c.events].reverse().find((e) => e.kind === "approved" && Date.parse(e.at) >= Date.parse(d.deliveredAt));
  return approved?.at ?? c.completedAt ?? d.deliveredAt;
}

/** "daftar_counter_v1_9x16.mp4" → "daftar_counter_v1". */
const baseName = (name: string) =>
  name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]?review[_-]?copy/i, "")
    .replace(/[_-]?(9x16|16x9|1x1|4x5|final|clean)$/i, "");

/**
 * The files to download. A campaign review copy unlocks at full quality. Every approved video also
 * comes with its raw footage (round 3: included in the price), listed as one archive.
 */
function filesFor(d: Delivery, video: boolean): DeliveryFile[] {
  const files: DeliveryFile[] = d.reviewCopy
    ? d.files.map((file) => ({
        name: file.name.replace(/[_-]?review[_-]?copy/i, "") || file.name,
        size: "Full quality",
        kind: file.kind,
      }))
    : d.files;
  if (!video) return files;
  const main = files.find((f) => f.kind === "video" || /\.(mp4|mov)$/i.test(f.name)) ?? files[0];
  const base = main ? baseName(main.name) : `yapp_${d.id}`;
  return [...files, { name: `${base}_raw_footage.zip`, size: "Unedited clips", kind: "archive" }];
}

export function libraryItemFor(s: DemoState, c: Commission): LibraryItem | undefined {
  const delivery = [...c.deliveries].reverse().find((d) => d.status === "approved");
  if (!delivery) return undefined;
  const approvedAt = approvalTime(c, delivery);
  const creator = creatorById(s, c.creatorId);
  const copy = isTextDelivery(delivery) || isAdCopy(c);
  const video = delivery.video;
  if (!copy && !video) return undefined;
  const base: ItemBase = {
    id: delivery.id,
    commission: c,
    delivery,
    creator,
    product: productById(s, c.brief.productId),
    approvedAt,
    versions: c.deliveries.length,
    usage: usageFor(c.brief.usage, approvedAt),
    files: filesFor(delivery, !copy),
  };
  if (copy || !video) return { ...base, kind: "copy", text: delivery.text?.trim() ?? "" };

  let campaign: VideoItem["campaign"];
  if (c.source === "campaign") {
    const request = c.requestId ? requestById(s, c.requestId) : undefined;
    const platform = slotPlatform(c, request);
    campaign = {
      request,
      platform,
      platformName: campaignPlatformById[platform].name,
      handle: creator?.socials?.find((a) => a.platform === platform)?.handle,
      brandHandle: request?.campaign ? brandHandleFor(request.campaign, platform) : undefined,
      status: c.post?.status ?? "due",
      keepLiveUntil: keepLiveUntil(c),
    };
  }
  return { ...base, kind: "video", video, campaign };
}

/** Everything approved for a buyer profile (default: the signed-in account's), newest first. */
export function libraryItems(s: DemoState, businessId: string = me.ids(s).businessId): LibraryItem[] {
  return s.commissions
    .filter((c) => c.businessId === businessId)
    .map((c) => libraryItemFor(s, c))
    .filter((item): item is LibraryItem => Boolean(item))
    .sort((a, b) => Date.parse(b.approvedAt) - Date.parse(a.approvedAt));
}

/** Approved videos only (Home's strip, a product's "Videos made"). */
export const libraryVideos = (s: DemoState, businessId?: string): VideoItem[] =>
  libraryItems(s, businessId).filter((item): item is VideoItem => item.kind === "video");

/** Find an item by delivery id or video id (Home and other pages deep-link with either). */
export const findItem = (items: LibraryItem[], key: string | null) =>
  key ? items.find((item) => item.id === key || (item.kind === "video" && item.video.id === key)) : undefined;

/** "@nina.makes" with an @, whatever the seed stored. */
export const atHandle = (handle: string) => (handle.startsWith("@") ? handle : `@${handle}`);

/** The item's title: a video's own title, or the job's for copy. */
export const itemTitle = (item: LibraryItem) => item.commission.title;

/** The quiet usage label on a card. */
export function usageLabel(item: LibraryItem): string {
  if (item.kind === "video" && item.campaign) {
    const where = item.campaign.handle ? `${atHandle(item.campaign.handle)}'s ${item.campaign.platformName}` : item.campaign.platformName;
    return item.campaign.status === "live" ? `Posted on ${where}` : `Posting on ${where}`;
  }
  const { usage } = item;
  if (!usage.ads) return "Organic use only";
  if (usage.adsUntil) return `Paid ads to ${yearDate(usage.adsUntil)}`;
  return "Paid ads, no end date";
}

export type UsageLine = { included: boolean; title: string; detail: string };

/** Usage rights in plain words, for the item's detail sheet. */
export function usageLines(item: LibraryItem): UsageLine[] {
  const { usage } = item;
  const copy = item.kind === "copy";
  const it = copy ? "the copy" : "it";
  const lines: UsageLine[] = [
    {
      included: true,
      title: copy ? "Use it in posts on your own accounts" : "Post it on your own accounts",
      detail: "Organic posts on your brand's accounts, with no end date.",
    },
  ];

  if (!usage.ads) {
    lines.push({
      included: false,
      title: "Paid ads not included",
      detail: `This order was for organic use only. To run ${copy ? "copy like this" : "a video like this"} as an ad, choose paid ads when you order again.`,
    });
  } else if (usage.adsUntil) {
    lines.push({
      included: true,
      title: `Run ${it} in paid ads until ${yearDate(usage.adsUntil)}`,
      detail: `${usage.months} months from approval on ${yearDate(item.approvedAt)}. Included in the price you paid.`,
    });
  } else {
    lines.push({
      included: true,
      title: `Run ${it} in paid ads, with no end date`,
      detail: "Included in the price you paid.",
    });
  }

  if (item.kind === "video") {
    lines.push({
      included: true,
      title: "Raw footage included",
      detail: "The unedited clips come with every approved video, for your own cuts.",
    });
  }

  if (item.kind === "video" && item.campaign) {
    const { campaign } = item;
    const where = campaign.handle ? `${atHandle(campaign.handle)} on ${campaign.platformName}` : campaign.platformName;
    lines.push({
      included: campaign.status === "live",
      title:
        campaign.status === "live"
          ? `Posted by ${where}`
          : campaign.status === "removed"
            ? `Post taken down by ${where}`
            : `Posting soon on ${where}`,
      detail:
        campaign.status === "live" && campaign.keepLiveUntil
          ? `Tagged ${campaign.brandHandle ?? "your account"} with the paid-partnership label. It stays up until ${yearDate(campaign.keepLiveUntil)}.`
          : campaign.status === "removed"
            ? "The creator has 48 hours to put it back up, or the slot's money returns to your campaign."
            : `The creator posts it tagging ${campaign.brandHandle ?? "your account"}, with the paid-partnership label. Their pay is released 7 days after we verify the post.`,
    });
  }
  return lines;
}
