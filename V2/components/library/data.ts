/**
 * The Library: every approved video on the signed-in buyer profile's orders, newest first. One item
 * per job (its latest approved version). Campaign slots count too: once approved, the creator's
 * video unlocks at full quality and is posted on their own account. Pure: safe in render.
 */
import { addDays } from "@/lib/clock";
import { shortDate } from "@/lib/format";
import { businessById, creatorById, keepLiveUntil, me, productById, requestById } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { campaignPlatformById, includedRights } from "@/lib/taxonomy";
import type {
  AddonId,
  CampaignPlatformId,
  Commission,
  ContentRequest,
  Creator,
  Delivery,
  Product,
  Video,
} from "@/lib/types";

const AD_DAYS: Partial<Record<AddonId, number>> = { "ad-rights-90": 90, "ad-rights-365": 365 };

export type LibraryItem = {
  /** The approved delivery's id (also accepted in `?video=`: the video's id). */
  id: string;
  commission: Commission;
  delivery: Delivery;
  video: Video;
  creator?: Creator;
  product?: Product;
  approvedAt: string;
  /** Versions delivered on the job, to say "Version 2 of 2". */
  versions: number;
  /** Paid-ads usage bought with the job, and until when (counted from approval). */
  ads?: { addon: AddonId; days: number; until: string };
  /** Campaign slots: where the creator posts it. */
  campaign?: {
    request?: ContentRequest;
    platform: CampaignPlatformId;
    platformName: string;
    handle?: string;
    status: "due" | "checking" | "live" | "removed";
    keepLiveUntil?: string;
  };
  /** Full-quality files (a campaign review copy's watermark is gone once approved). */
  files: { name: string; size: string }[];
};

/** When the version was approved: the approval event, else completion, else the upload. */
function approvalTime(c: Commission, d: Delivery): string {
  const approved = [...c.events].reverse().find((e) => e.kind === "approved" && Date.parse(e.at) >= Date.parse(d.deliveredAt));
  return approved?.at ?? c.completedAt ?? d.deliveredAt;
}

function fullQualityFiles(d: Delivery): LibraryItem["files"] {
  if (!d.reviewCopy) return d.files;
  return d.files.map((file) => ({
    name: file.name.replace(/[_-]?review[_-]?copy/i, "") || file.name,
    size: "Full quality",
  }));
}

export function libraryItemFor(s: DemoState, c: Commission): LibraryItem | undefined {
  const delivery = [...c.deliveries].reverse().find((d) => d.status === "approved");
  if (!delivery) return undefined;
  const approvedAt = approvalTime(c, delivery);
  const adAddon = c.addons.find((a) => AD_DAYS[a.id]);
  const days = adAddon ? AD_DAYS[adAddon.id]! : 0;
  const creator = creatorById(s, c.creatorId);
  let campaign: LibraryItem["campaign"];
  if (c.source === "campaign") {
    const request = c.requestId ? requestById(s, c.requestId) : undefined;
    const platform = request?.campaign?.platform ?? "tiktok";
    campaign = {
      request,
      platform,
      platformName: campaignPlatformById[platform].name,
      handle: creator?.socials?.find((a) => a.platform === platform)?.handle,
      status: c.post?.status ?? "due",
      keepLiveUntil: keepLiveUntil(c),
    };
  }
  return {
    id: delivery.id,
    commission: c,
    delivery,
    video: delivery.video,
    creator,
    product: productById(s, c.brief.productId),
    approvedAt,
    versions: c.deliveries.length,
    ads: adAddon ? { addon: adAddon.id, days, until: addDays(approvedAt, days) } : undefined,
    campaign,
    files: fullQualityFiles(delivery),
  };
}

/** Approved videos for a buyer profile (default: the signed-in account's), newest first. */
export function libraryItems(s: DemoState, businessId: string = me.ids(s).businessId): LibraryItem[] {
  return s.commissions
    .filter((c) => c.businessId === businessId)
    .map((c) => libraryItemFor(s, c))
    .filter((item): item is LibraryItem => Boolean(item))
    .sort((a, b) => Date.parse(b.approvedAt) - Date.parse(a.approvedAt));
}

/** Find an item by delivery id or video id (Home and other pages deep-link with either). */
export const findItem = (items: LibraryItem[], key: string | null) =>
  key ? items.find((item) => item.id === key || item.video.id === key) : undefined;

/** "@nina.makes" with an @, whatever the seed stored. */
export const atHandle = (handle: string) => (handle.startsWith("@") ? handle : `@${handle}`);

/** The quiet usage label on a card. */
export function usageLabel(item: LibraryItem): string {
  if (item.campaign) {
    const where = item.campaign.handle ? `${atHandle(item.campaign.handle)}'s ${item.campaign.platformName}` : item.campaign.platformName;
    return item.campaign.status === "live" ? `Posted on ${where}` : `Posting on ${where}`;
  }
  if (item.ads) return `Organic and paid ads to ${shortDate(item.ads.until)}`;
  return "Organic use";
}

export type UsageLine = { included: boolean; title: string; detail: string };

/** Usage rights in plain words, for the video's detail panel. */
export function usageLines(s: DemoState, item: LibraryItem): UsageLine[] {
  const business = businessById(s, item.commission.businessId);
  const lines: UsageLine[] = [
    {
      included: true,
      title: "Post it on your own accounts",
      detail: `${includedRights} Included with every order.`,
    },
  ];
  if (item.ads) {
    lines.push({
      included: true,
      title: `Run it as a paid ad until ${shortDate(item.ads.until)}`,
      detail: `${item.ads.days === 365 ? "12 months" : `${item.ads.days} days`} of paid-ads usage from approval, bought with the order.`,
    });
  } else {
    lines.push({
      included: false,
      title: "Paid ads not included",
      detail: `To run it as an ad, add paid-ads usage when you order from ${item.creator?.firstName ?? "this creator"} again.`,
    });
  }
  if (item.campaign) {
    const where = item.campaign.handle ? `${atHandle(item.campaign.handle)} on ${item.campaign.platformName}` : item.campaign.platformName;
    lines.push({
      included: item.campaign.status === "live",
      title:
        item.campaign.status === "live"
          ? `Posted by ${where}`
          : item.campaign.status === "removed"
            ? `Post taken down by ${where}`
            : `Posting soon on ${where}`,
      detail:
        item.campaign.status === "live" && item.campaign.keepLiveUntil
          ? `Tagged ${item.campaign.request?.campaign?.brandHandle ?? business?.name ?? "you"} with the paid-partnership label. It stays up until ${shortDate(item.campaign.keepLiveUntil)}.`
          : item.campaign.status === "removed"
            ? "The creator has 48 hours to put it back up, or the slot's money returns to your campaign."
            : "The creator posts it with your tag and the paid-partnership label. Their pay is released 7 days after we verify the post.",
    });
  }
  return lines;
}
