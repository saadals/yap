import type { ReactNode } from "react";

import type { AudienceSlug, ServiceSlug } from "@/components/shell/services";
import { money, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { campaignBudget, isCampaign, startingPrice } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import {
  AUTO_APPROVE_DAYS,
  BUDGET_MIN,
  CAMPAIGN_DEADLINE_OPTIONS,
  CAMPAIGN_KEEP_LIVE_DAYS,
  CAMPAIGN_MIN_VIDEOS,
  CAMPAIGN_OPEN_DAYS,
  CAMPAIGN_RELEASE_DAYS,
  CAMPAIGN_RESTORE_HOURS,
  CAMPAIGN_STEP,
  PRICE_MIN_PER_YAPP,
  addonById,
  campaignPlatforms,
  followerTiers,
  formatById,
  formats,
  jobTypeById,
  niches,
  usageOptions,
} from "@/lib/taxonomy";

/**
 * Copy for the five service pages (Site-wide 5.8.4), a first draft for the owner to edit. Every
 * line describes what the product does today (round 3 answers, "Current rules at a glance"):
 * the brand pays the listed price with nothing added, payment is held, usage rights are part of
 * the price, raw footage comes with every video. Figures come from the store and lib/taxonomy,
 * never typed in, and none of them is an ad metric (no account can be connected yet).
 */

export type ServiceFact = { value: ReactNode; label: string };
export type ServiceStep = { title: string; body: string };
export type ServiceFaq = { q: string; a: ReactNode };

export type ServiceContent = {
  slug: ServiceSlug | AudienceSlug;
  eyebrow: string;
  /** Eight words at most. */
  title: string;
  lead: string;
  start: string;
  creators: string;
  facts: (s: DemoState) => ServiceFact[];
  factsNote: string;
  stepsTitle: string;
  steps: ServiceStep[];
  /** Review ids from the store, shown as proof when they exist. */
  reviews: string[];
  reviewsTitle: string;
  includedTitle: string;
  included: (s: DemoState) => ReactNode[];
  pricing: (s: DemoState) => { title: string; body: ReactNode };
  faq: (s: DemoState) => ServiceFaq[];
  closing: { title: string; body: string };
};

/* ------------------------------------------------------------- shared lines */

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const orList = (items: string[]) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
const andList = (items: string[]) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/** "paid ads for 12 months, paid ads for 6 months, organic only or paid ads with no end date". */
const usageTerms = () => orList(usageOptions.map((option) => option.phrase));
const platformNames = () => orList(campaignPlatforms.map((p) => p.name));
const deadlineChoices = () => `${orList(CAMPAIGN_DEADLINE_OPTIONS.map(String))} days`;
const tierRange = () => `${followerTiers[0].label} up to ${followerTiers[followerTiers.length - 1].label}`;

const lowestPackage = (s: DemoState) => {
  const prices = s.creators.filter((c) => c.packages.length).map(startingPrice);
  return prices.length ? Math.min(...prices) : null;
};
const makers = (s: DemoState, format: string) => s.creators.filter((c) => c.formats.includes(format as never));
const openCampaignCount = (s: DemoState) =>
  s.requests.filter((r) => isCampaign(r) && r.status === "open").length;
const openCustomCount = (s: DemoState) =>
  s.requests.filter((r) => !isCampaign(r) && r.status === "open").length;

const chargedAndHeld =
  "The full amount, Yapps times your price, is held when you post. Each Yapp is paid out after you approve its video and its post is verified; Yapps nobody picks are refunded when the campaign closes.";

const usageAnswer = () =>
  `Yes. Every order carries one usage term, chosen by you and included in the price: ${usageTerms()}. Raw footage comes with every approved video.`;

const revisionsAnswer =
  "Leave comments on the video, at the exact second when it helps, and ask for changes. Two revisions are included. After that you can approve, agree a paid extra revision with the creator, or open a dispute.";

/* ------------------------------------------------------------------- pages */

const ugcAds: ServiceContent = {
  slug: "ugc-ads",
  eyebrow: "UGC ads",
  title: "Creator videos made to run as ads",
  lead: "Post a custom order, hire the creator whose pitch you like best, and get a vertical video made for paid social.",
  start: paths.newOrder({ type: "custom", service: "ugc-ads" }),
  creators: paths.findCreators(),
  facts: (s) => {
    const lowest = lowestPackage(s);
    return [
      { value: s.creators.length, label: "creators taking orders" },
      { value: formats.length, label: "formats to choose from" },
      { value: lowest ? money(lowest) : "—", label: "lowest package price" },
      { value: openCustomCount(s), label: "custom orders open now" },
    ];
  },
  factsNote: "Live figures from Yapp. The price you agree is the price you pay.",
  stepsTitle: "From brief to approved ad",
  steps: [
    {
      title: "Post a custom order",
      body: `Describe the product, who it's for and what the video should do. Set a budget from ${money(BUDGET_MIN)} and a deadline.`,
    },
    {
      title: "Pick a pitch",
      body: "Creators pitch an angle and a price within your budget. Hire one, and your payment is held from that moment.",
    },
    {
      title: "Review with comments",
      body: "Comment on each version, pinned to the exact second. Two revisions are included.",
    },
    {
      title: "Approve and run it",
      body: "Approving releases the payment. You get the final file and the raw footage, for the usage term you chose.",
    },
  ],
  reviews: ["rv-1", "rv-6", "rv-11"],
  reviewsTitle: "What brands said after approving",
  includedTitle: "What every UGC ad includes",
  included: () => [
    `A video in the format you pick: ${andList(formats.slice(0, 4).map((f) => lower(f.name)))} and more`,
    "Two revisions, with comments pinned to the second",
    "Raw footage with every approved video",
    `Usage rights included in the price: ${usageTerms()}`,
    "Payment held until you approve, and a full refund if the video isn't delivered",
  ],
  pricing: (s) => {
    const lowest = lowestPackage(s);
    return {
      title: "You set the budget",
      body: (
        <>
          Creators pitch within your budget, from {money(BUDGET_MIN)}. To pick a price upfront, order a
          package from a creator&apos;s profile{lowest ? <>: packages start at {money(lowest)}</> : null}. Nothing
          is added at checkout.
        </>
      ),
    };
  },
  faq: (s) => {
    const lowest = lowestPackage(s);
    return [
      {
        q: "How much does a UGC ad cost?",
        a: `You set the budget for a custom order, from ${money(BUDGET_MIN)}, and creators pitch within it. If you'd rather see a price first, order a package from a creator's profile${
          lowest ? `; packages start at ${money(lowest)}` : ""
        }. The price you agree is the price you pay.`,
      },
      { q: "Can I run the video as a paid ad?", a: usageAnswer() },
      { q: "What if I don't like the first version?", a: revisionsAnswer },
      {
        q: "When is the creator paid?",
        a: `Your payment is held from the moment you hire. It's released when you approve, or automatically ${AUTO_APPROVE_DAYS} days after a delivery if you don't respond. If the video isn't delivered, you get a full refund.`,
      },
      {
        q: "Do creators need my product?",
        a: "For an app or software, give the creator a demo or free account in the brief. Yapp doesn't ship products yet, so for a device the creator uses one they already own.",
      },
    ];
  },
  closing: {
    title: "Brief your first UGC ad",
    body: "Post a custom order in a few minutes. Payment is held until you approve the video.",
  },
};

const nativePosts: ServiceContent = {
  slug: "native-posts",
  eyebrow: "Native posts",
  title: "Your product, posted by creators people follow",
  lead: "Run a UGC campaign: ten or more creators each make a video and post it on their own account, with your tag and the paid-partnership label.",
  start: paths.newOrder({ type: "campaign", service: "native-posts" }),
  creators: paths.findCreators(),
  facts: (s) => [
    { value: openCampaignCount(s), label: "UGC campaigns taking creators" },
    { value: `${CAMPAIGN_MIN_VIDEOS}+`, label: "creators per campaign" },
    { value: `${CAMPAIGN_KEEP_LIVE_DAYS} days`, label: "each post stays up" },
    { value: `${CAMPAIGN_RELEASE_DAYS} days`, label: "after verification, the creator is paid" },
  ],
  factsNote: "Campaign figures from Yapp's rules and its live campaigns.",
  stepsTitle: "How a native posts campaign runs",
  steps: [
    {
      title: "Post the campaign",
      body: `Set the brief, ${CAMPAIGN_MIN_VIDEOS} or more Yapps in steps of ${CAMPAIGN_STEP}, your price per Yapp from ${money(PRICE_MIN_PER_YAPP)}, the follower tier and the platforms. The full amount is held.`,
    },
    {
      title: "Creators pick a Yapp",
      body: "Creators in your follower tier pick one Yapp each, first come, first served, and upload within the deadline you set.",
    },
    {
      title: "Approve the review copy",
      body: "Each creator sends a watermarked review copy. Approve it, ask for changes, or reject it and the Yapp reopens.",
    },
    {
      title: "They post, Yapp verifies",
      body: `The creator posts on their own account. Once the post is verified it stays up ${CAMPAIGN_KEEP_LIVE_DAYS} days, and the creator is paid ${CAMPAIGN_RELEASE_DAYS} days after verification.`,
    },
  ],
  reviews: ["rv-18", "rv-51", "rv-19"],
  reviewsTitle: "Brands on creators who posted for them",
  includedTitle: "What every campaign includes",
  included: () => [
    "One creator per Yapp, each posting to their own followers",
    "Follower counts checked through each creator's connected account",
    `Posts on ${platformNames()}: you list the platforms, each creator posts on one`,
    "Your tag and the paid-partnership label checked on every post before anyone is paid",
    `Posts kept up for ${CAMPAIGN_KEEP_LIVE_DAYS} days after verification`,
    "Yapps nobody picks refunded when the campaign closes",
  ],
  pricing: () => {
    const example = campaignBudget(10, 120);
    return {
      title: "One price per Yapp",
      body: (
        <>
          You set it, from {money(PRICE_MIN_PER_YAPP)}; the campaign shows a usual range for your category and
          tier as a guide. {example.videos} Yapps at {money(example.pricePerVideo)} is {money(example.total)},
          held when you post, with nothing added.
        </>
      ),
    };
  },
  faq: () => [
    {
      q: "Who can pick a Yapp?",
      a: `Creators whose verified follower count on a connected account sits inside the tier you choose, from ${tierRange()}. One creator, one Yapp, first come, first served.`,
    },
    { q: "When am I charged?", a: chargedAndHeld },
    {
      q: "How long does a campaign run?",
      a: `A campaign takes picks for ${CAMPAIGN_OPEN_DAYS} days. You choose how long each creator has to upload after picking: ${deadlineChoices()}.`,
    },
    {
      q: "What if a post comes down?",
      a: `Posts stay up for ${CAMPAIGN_KEEP_LIVE_DAYS} days from verification. If one comes down before the creator is paid, they have ${CAMPAIGN_RESTORE_HOURS} hours to restore it; otherwise that Yapp's money comes back to you.`,
    },
    { q: "Can I use the videos in my own ads too?", a: usageAnswer() },
    {
      q: "Can I change the price after posting?",
      a: "You can raise the price for Yapps nobody has picked yet. It never goes down once the campaign is live.",
    },
  ],
  closing: {
    title: "Put your product in creators' feeds",
    body: "Post a UGC campaign. You approve every video before it goes up.",
  },
};

const hookLab: ServiceContent = {
  slug: "hook-lab",
  eyebrow: "Hook Lab",
  title: "Several openings, one ad, ready to test",
  lead: "Order an ad hook pack: a creator films several short openings for the same ad body, so your team can test which one works.",
  start: paths.newOrder({ type: "custom", service: "hook-lab" }),
  creators: paths.findCreators({ format: "hook-pack" }),
  facts: (s) => {
    const packReviews = s.reviews.filter((r) => r.format === "hook-pack");
    const average = packReviews.length
      ? (packReviews.reduce((sum, r) => sum + r.rating, 0) / packReviews.length).toFixed(1)
      : "—";
    return [
      { value: makers(s, "hook-pack").length, label: "creators who make hook packs" },
      { value: packReviews.length, label: "hook packs reviewed by brands" },
      { value: average, label: "average rating out of 5" },
      {
        value: s.creators.filter((c) => c.addons.some((a) => a.id === "extra-hooks")).length,
        label: "creators offering alternate hooks",
      },
    ];
  },
  factsNote: "Live figures from Yapp. Hook results stay in your ad account.",
  stepsTitle: "How a hook pack comes together",
  steps: [
    {
      title: "Brief the ad body",
      body: "Share the script or the angle, how many openings you want, and who each one should speak to.",
    },
    {
      title: "Hire a creator",
      body: "Creators who make hook packs pitch within your budget. Hire one; your payment is held from then.",
    },
    {
      title: "Get every opening",
      body: "Each opening is made for the same ad body, so your editor can swap them in and out.",
    },
    {
      title: "Approve and test",
      body: "Approve to release the payment, then run the openings against each other in your ad account.",
    },
  ],
  reviews: ["rv-17", "rv-25", "rv-43"],
  reviewsTitle: "Hook packs brands have approved",
  includedTitle: "What Hook Lab includes",
  included: () => [
    `An ${lower(formatById["hook-pack"].name)}: ${lower(formatById["hook-pack"].short)}`,
    `Or ${lower(addonById["extra-hooks"].name)} added to any video, from creators who offer it`,
    "Two revisions across the whole pack",
    "Raw footage with every approved video",
    `Usage rights included in the price: ${usageTerms()}`,
  ],
  pricing: (s) => {
    const prices = s.creators.flatMap((c) => c.addons.filter((a) => a.id === "extra-hooks").map((a) => a.price));
    const from = prices.length ? Math.min(...prices) : null;
    return {
      title: "Priced like any order",
      body: (
        <>
          A hook pack is a custom order within your budget, from {money(BUDGET_MIN)}, or a package from a
          creator&apos;s profile.{" "}
          {from ? (
            <>
              The {lower(addonById["extra-hooks"].name)} add-on starts at {money(from)}.
            </>
          ) : null}
        </>
      ),
    };
  },
  faq: () => [
    {
      q: "What's the difference between a hook pack and alternate hooks?",
      a: `A hook pack is its own order: several openings made for one ad body. Alternate hooks are an add-on to a video you're already ordering: ${lower(addonById["extra-hooks"].name)} from the same creator.`,
    },
    {
      q: "Does Yapp tell me which hook wins?",
      a: "Not yet. You test the hooks in your own ad account; Yapp doesn't connect to ad accounts, so it shows no ad results.",
    },
    {
      q: "Can I order more hooks later?",
      a: "Yes. Order again from the completed order, and the brief, your product and what you learned carry over.",
    },
    { q: "How many changes can I ask for?", a: revisionsAnswer },
  ],
  closing: {
    title: "Find the opening that works",
    body: "Order a hook pack as a custom order. Payment is held until you approve.",
  },
};

const goToMarket: ServiceContent = {
  slug: "go-to-market",
  eyebrow: "Go to market",
  title: "Launch with ten creators on one brief",
  lead: "Use a UGC campaign as a launch wave: ten or more creators make and post videos from the same brief, within a deadline you set.",
  start: paths.newOrder({ type: "campaign", service: "go-to-market" }),
  creators: paths.findCreators(),
  facts: () => [
    { value: `${CAMPAIGN_MIN_VIDEOS}+`, label: "creators on one brief" },
    {
      value: `${CAMPAIGN_DEADLINE_OPTIONS[0]}–${CAMPAIGN_DEADLINE_OPTIONS[CAMPAIGN_DEADLINE_OPTIONS.length - 1]} days`,
      label: "to upload, a deadline you set",
    },
    { value: `${CAMPAIGN_OPEN_DAYS} days`, label: "for creators to pick" },
    { value: `${CAMPAIGN_KEEP_LIVE_DAYS} days`, label: "each post stays up" },
  ],
  factsNote: "The campaign rules a launch runs on.",
  stepsTitle: "How a launch wave runs",
  steps: [
    {
      title: "Write one launch brief",
      body: "The product, the message and what every video must show. Start from a saved product and its learnings come along.",
    },
    {
      title: "Set the wave",
      body: `Choose ${CAMPAIGN_MIN_VIDEOS} or more Yapps, a price per Yapp, the follower tier and an upload deadline. The full amount is held when you post.`,
    },
    {
      title: "Creators pick and film",
      body: `Creators pick Yapps first come, first served, over ${CAMPAIGN_OPEN_DAYS} days. Approve each review copy as it arrives.`,
    },
    {
      title: "Posts go live",
      body: "Each creator posts on their own account with your tag and the paid-partnership label. Every post is verified.",
    },
  ],
  reviews: ["rv-4", "rv-21", "rv-39"],
  reviewsTitle: "Brands on videos made for a launch",
  includedTitle: "What a launch wave includes",
  included: () => [
    `${CAMPAIGN_MIN_VIDEOS} or more creators, one video each, on a single brief`,
    `An upload deadline you set: ${deadlineChoices()} after each pick`,
    `A ${CAMPAIGN_OPEN_DAYS}-day window for creators to pick`,
    `Posts on ${platformNames()}, each checked for your tag and the paid-partnership label`,
    `Usage rights for your own ads, included in the price: ${usageTerms()}`,
  ],
  pricing: () => {
    const example = campaignBudget(15, 140);
    return {
      title: "One price per Yapp",
      body: (
        <>
          From {money(PRICE_MIN_PER_YAPP)}, set by you. {example.videos} Yapps at {money(example.pricePerVideo)} is{" "}
          {money(example.total)}, held when you post; Yapps nobody picks are refunded when the campaign closes.
        </>
      ),
    };
  },
  faq: () => [
    {
      q: "Can every video go live on launch day?",
      a: "Not yet: Yapp doesn't schedule posts. Each creator posts after you approve their video, so a short upload deadline and quick approvals keep the wave close together.",
    },
    { q: "When am I charged?", a: chargedAndHeld },
    {
      q: "What if a creator misses the deadline?",
      a: "Until they upload, you can remove a creator from the campaign, and their Yapp reopens for someone else.",
    },
    {
      q: "Who are the creators?",
      a: `People who make videos about tech, each with a follower count verified through a connected account. The tier you pick, from ${tierRange()}, decides who can join.`,
    },
    { q: "Can I use the launch videos in ads?", a: usageAnswer() },
  ],
  closing: {
    title: "Plan your launch wave",
    body: "Post a UGC campaign with one brief and a deadline you set.",
  },
};

const techTeams: ServiceContent = {
  slug: "tech-teams",
  eyebrow: "For tech teams",
  title: "Short videos for apps, SaaS, AI and gadgets",
  lead: "Creators who know tech explain your product the way your customers talk about it, in custom orders and UGC campaigns.",
  start: paths.newOrder({ service: "tech-teams" }),
  creators: paths.findCreators(),
  facts: (s) => [
    { value: niches.length, label: "tech categories" },
    { value: s.creators.length, label: "creators taking orders" },
    { value: formats.length, label: "formats to choose from" },
    { value: s.reviews.length, label: "reviews from brands" },
  ],
  factsNote: "Live figures from Yapp.",
  stepsTitle: "How tech teams use Yapp",
  steps: [
    {
      title: "Save your product once",
      body: "The audience, the problem it solves, the tone, the dos and don'ts. Every order starts from it.",
    },
    {
      title: "Choose how to order",
      body: `A custom order for a video made to your brief, or a UGC campaign of ${CAMPAIGN_MIN_VIDEOS} or more creators who post on their own accounts.`,
    },
    {
      title: "Review in one place",
      body: "Comments on each version, messages with the creator, and payment held until you approve.",
    },
    {
      title: "Order again with what you learned",
      body: "Notes from each order are saved to the product and carried into the next brief.",
    },
  ],
  reviews: ["rv-30", "rv-46", "rv-28"],
  reviewsTitle: "Tech teams on their videos",
  includedTitle: "Made for tech products",
  included: () => [
    `${plural(niches.length, "category", "categories")}: ${andList(niches.map((n) => n.noun))}`,
    `Formats made for software and devices: ${andList(formats.slice(0, 5).map((f) => lower(f.name)))}`,
    `${jobTypeById["ad-copy"].name} as a custom order, for the words around your videos`,
    "Saved products and learnings that carry into every brief",
    "Usage rights included in the price, and raw footage with every approved video",
    "No shipping yet: creators use their own device, or access is digital",
  ],
  pricing: (s) => {
    const lowest = lowestPackage(s);
    return {
      title: "Prices you can see",
      body: (
        <>
          Creator packages show their price upfront{lowest ? <>, from {money(lowest)}</> : null}, and a UGC
          campaign shows its price per Yapp. For a custom order you set the budget and creators pitch within
          it. Nothing is added at checkout.
        </>
      ),
    };
  },
  faq: () => [
    {
      q: "Do creators need access to my app?",
      a: "Yes: for an app or software, give the creator a demo or free account in the brief. Yapp doesn't ship products yet, so for a device the creator uses one they already own.",
    },
    {
      q: "Can someone write the ad copy too?",
      a: `Yes. ${jobTypeById["ad-copy"].name} is a custom order: a writer pitches, delivers the text or a document, and you approve it like a video.`,
    },
    {
      q: "Can my team share one account?",
      a: "A Business account adds your company details, invoices with your tax ID, and team members.",
    },
    {
      q: "Where is Yapp available?",
      a: "Yapp launches in Canada and the United States, with prices in US dollars.",
    },
  ],
  closing: {
    title: "Get your product explained by a creator",
    body: "Post a custom order or a UGC campaign. Payment is held until you approve.",
  },
};

export const serviceContent: Record<ServiceSlug | AudienceSlug, ServiceContent> = {
  "ugc-ads": ugcAds,
  "native-posts": nativePosts,
  "hook-lab": hookLab,
  "go-to-market": goToMarket,
  "tech-teams": techTeams,
};
