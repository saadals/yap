"use client";

import { money } from "@/lib/format";
import type { DemoState } from "@/lib/store";
import { AUTO_APPROVE_DAYS, BUDGET_MIN, jobTypeById, usageOptions } from "@/lib/taxonomy";

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
  | "adcopy"
  | "speed"
  | "cancel"
  | "invoices"
  | "pay";

const orList = (items: string[]) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;

/** "paid ads for 12 months, paid ads for 6 months, organic use only or paid ads with no end date". */
export const usageTerms = () => orList(usageOptions.map((option) => option.phrase));

/**
 * Questions brands ask, in one place so the landing page (a short set) and How it works (all of
 * them) say the same thing. Numbers come from the store and the taxonomy constants. The rules are
 * round 3's: the brand pays the listed price and nothing on top; usage rights, raw footage and two
 * revisions are part of it; a campaign's price is set by the brand and its tier decides who picks.
 */
export function brandFaq(s: DemoState): Record<BrandFaqId, FaqItem> {
  const stats = platformStats(s);
  const typical = typicalAddonPrices(s);
  const campaign = campaignFacts();
  const adCopy = jobTypeById["ad-copy"].name;
  return {
    pay: {
      q: "When do I pay, and what if the video never arrives?",
      a: `You pay the price you agreed, with nothing added, when the creator starts, and Yapp holds the money. It's released when you approve the video, or by itself ${AUTO_APPROVE_DAYS} days after delivery if you don't respond (we remind you 48 hours, 24 hours and 2 hours before). If the creator doesn't deliver, you get back everything you paid.`,
    },
    rights: {
      q: "Who owns the videos, and where can I use them?",
      a: (
        <>
          <p>
            You choose how you&apos;ll use the videos on every order, and it&apos;s part of the price, with no
            separate rights fee: {usageTerms()}. Every option covers your own accounts, website and app.
          </p>
          <p>
            Raw footage comes with every approved video. Creators can show finished work in their portfolio
            unless your brief asks them to keep it private.
          </p>
        </>
      ),
    },
    revisions: {
      q: "How many revisions do I get?",
      a: "Two, on every order. Leave comments on the video, at the exact second when it helps, and request changes with the ones you tick. After two rounds you can approve, agree a paid extra revision with the creator, or open a dispute.",
    },
    unhappy: {
      q: "What if I don't like the video?",
      a: "Use your two revisions and comment on the moments that need work. If a delivery still doesn't match the agreed brief, open a dispute from the order. A person at Yapp replies within 48 hours, reviews the brief, comments and versions, and can refund you in full or in part.",
    },
    language: {
      q: "Can I choose the language?",
      a: "Yes. Filter creators by language and set the languages in your brief. Creators only list languages they speak natively. Want the same video in English and Spanish? Ask for two versions, or hire two creators.",
    },
    campaign: {
      q: "What's a UGC campaign?",
      a: `An order for ${campaign.minVideos} or more videos, in steps of ${campaign.step}, each from a different creator who posts it on their own account. You set the price per Yapp, from ${money(campaign.fromPrice)}, with a usual range shown as a guide; the follower tier you pick decides who can pick a Yapp. The full amount is held when you post, with nothing on top. Creators pick first come, first served, for ${campaign.openDays} days. You review each video, then they post it tagging you, with the paid-partnership label. They're paid ${campaign.releaseDays} days after we verify the post, and keep it up for ${campaign.keepLiveDays} days.`,
    },
    post: {
      q: "Can creators post the video on their own accounts?",
      a: `In a campaign, always: that's the point. On a custom order, only if you add “Post to creator's account” (typically about ${money(typical["post-to-account"])}). Otherwise the video is yours to publish.`,
    },
    accounts: {
      q: "Do I need a separate account to make videos?",
      a: "No. One account orders videos and makes them. Switch to Studio whenever you want to pitch on custom orders or pick a Yapp in a campaign.",
    },
    script: {
      q: "Do I need to write a script?",
      a: "No. Describe the goal, the key message and what to avoid, and add a hook line if you have one. Creators propose an angle in their pitch and usually draft the script with you before filming.",
    },
    adcopy: {
      q: "Can someone write the ad copy too?",
      a: `Yes. ${adCopy} is a custom order: you say how many pieces and where they'll run, a writer pitches, delivers the text or a document, and you approve it like a video. There's nothing to film or post. Budgets start at ${money(BUDGET_MIN)}.`,
    },
    speed: {
      q: "How quickly will I get a video?",
      a: `You set the delivery deadline on a custom order. The median creator delivers a first version in ${stats.firstDeliveryDays} days, and every package shows its turnaround before you order. Many creators offer rush delivery as an add-on.`,
    },
    cancel: {
      q: "Can I cancel an order?",
      a: "A direct order can be withdrawn free until the creator accepts. After that, cancel by agreement for a refund, or get a full refund automatically if they miss the deadline without delivering. If you can't agree, Yapp decides. Closing a campaign refunds the Yapps nobody picked; videos already in progress carry on.",
    },
    invoices: {
      q: "Do you provide invoices? What about tax?",
      a: "Every payment creates a receipt in Billing with your company details. Prices are in US dollars, and the price you agree is what you pay: Yapp's fee comes out of the creator's side, not yours.",
    },
  };
}
