"use client";

import { money } from "@/lib/format";
import type { DemoState } from "@/lib/store";
import { AUTO_APPROVE_DAYS } from "@/lib/taxonomy";

import type { FaqItem } from "./blocks";
import { campaignFacts, platformStats, typicalAddonPrices } from "./platform";

export type BrandFaqId =
  | "rights"
  | "revisions"
  | "unhappy"
  | "language"
  | "campaign"
  | "post"
  | "accounts"
  | "script"
  | "speed"
  | "cancel"
  | "invoices"
  | "pay";

/**
 * Questions brands ask, in one place so the landing page (a short set) and How it works (all of
 * them) say the same thing. Numbers come from the store and the taxonomy constants.
 */
export function brandFaq(s: DemoState): Record<BrandFaqId, FaqItem> {
  const stats = platformStats(s);
  const typical = typicalAddonPrices(s);
  const campaign = campaignFacts();
  return {
    pay: {
      q: "When do I pay, and what if the video never arrives?",
      a: `You pay when the creator starts, and Yapp holds the money. It's released when you approve the video, or by itself ${AUTO_APPROVE_DAYS} days after delivery if you don't respond (we remind you first). If the creator doesn't deliver, you get a full refund, our ${campaign.customFeePct}% service fee included.`,
    },
    rights: {
      q: "Who owns the videos, and where can I use them?",
      a: (
        <>
          <p>
            You can use the final video on your own accounts, website and app, for good. Running it as a
            paid ad needs the paid-ads usage add-on: typically about {money(typical["ad-rights-90"])} for 90
            days or {money(typical["ad-rights-365"])} for 12 months.
          </p>
          <p>
            Raw footage is an add-on too. Creators can show finished work in their portfolio unless your
            brief asks them to keep it private.
          </p>
        </>
      ),
    },
    revisions: {
      q: "How many revisions do I get?",
      a: `It depends on the package: most include one or two rounds, and the number is shown before you pay. You leave notes at the exact second that needs work. An extra round typically costs around ${money(typical["extra-revision"])}.`,
    },
    unhappy: {
      q: "What if I don't like the video?",
      a: "Use your revision rounds and point at the moments that need work. If a delivery still doesn't match the agreed brief, open a resolution from the order. Yapp support reviews the brief, messages and versions, and can refund you in full or in part.",
    },
    language: {
      q: "Can I choose the language?",
      a: "Yes. Filter creators by language and set the languages in your brief. Creators only list languages they speak natively. Want the same video in English and Spanish? Ask for two versions, or hire two creators from the same order.",
    },
    campaign: {
      q: "What's a UGC campaign?",
      a: `An order for ${campaign.minVideos} or more videos, in steps of ${campaign.step}, each from a different creator who posts it on their own account. A follower tier sets one fixed price per video (from ${money(campaign.fromPrice)}). The total plus the ${campaign.feePct}% service fee is held up front. Creators take slots first come, first served, for ${campaign.openDays} days. You review each video, then they post it tagging you, with the paid-partnership label. They're paid ${campaign.releaseDays} days after we verify the post, and keep it up for ${campaign.keepLiveDays} days.`,
    },
    post: {
      q: "Can creators post the video on their own accounts?",
      a: `In a campaign, always: that's the point. On other orders, only if you add “Post to creator's account” (typically from about ${money(typical["post-to-account"])}). Otherwise the video is yours to publish.`,
    },
    accounts: {
      q: "Do I need a separate account to make videos?",
      a: "No. One account orders videos and makes them. Switch to Studio whenever you want to pitch on briefs or take campaign slots.",
    },
    script: {
      q: "Do I need to write a script?",
      a: "No. Describe the goal, the key message and what to avoid. Creators propose an angle in their pitch and usually draft the script with you before filming.",
    },
    speed: {
      q: "How quickly will I get a video?",
      a: `The median creator delivers a first version in ${stats.firstDeliveryDays} days, and every package shows its turnaround before you order. Many creators offer rush delivery as an add-on.`,
    },
    cancel: {
      q: "Can I cancel an order?",
      a: "A direct order can be withdrawn free until the creator accepts. After that, cancel by agreement for a refund, or get a full refund automatically if they miss the deadline without delivering. If you can't agree, Yapp support decides. Closing a campaign refunds its open slots; videos already in progress carry on.",
    },
    invoices: {
      q: "Do you provide invoices? What about tax?",
      a: "Every payment creates a receipt in Billing with your company details. Prices are in US dollars. Where sales tax, GST/HST or VAT applies to Yapp's service fee, it's shown separately on the receipt.",
    },
  };
}
