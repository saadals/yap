"use client";

import { Eye, ShieldCheck } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { PublicShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { PillButton } from "@/components/ui/pill-button";
import { Tabs } from "@/components/ui/tabs";
import { money, moneyExact, moneyRange } from "@/lib/format";
import { paths } from "@/lib/paths";
import { priceGuidance } from "@/lib/pricing";
import { campaignBudget } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { AUTO_APPROVE_DAYS, BUDGET_MIN, FEE_PCT, ORDER_DEADLINE_OPTIONS, ORDER_OPEN_DAYS } from "@/lib/taxonomy";

import { CheckList, Faq, IconTile, MarketingMain, Section, StepNumber, useStartLinks } from "./blocks";
import { FeeCalculator } from "./calculators";
import { brandFaq } from "./faq-content";
import { campaignFacts, platformStats } from "./platform";
import { type SectionLink, SectionNav } from "./section-nav";

const sections: SectionLink[] = [
  { id: "steps", label: "Steps" },
  { id: "pricing", label: "Pricing" },
  { id: "protection", label: "Protection" },
  { id: "faq", label: "FAQ" },
];

/** /how-it-works: the steps for each way of ordering, pricing, payment protection, FAQ. */
export function HowItWorksPage() {
  return (
    <PublicShell>
      <MarketingMain>
        <Hero />
        <SectionNav items={sections} label="On this page" className="mt-8" />
        <Steps />
        <Pricing />
        <Protection />
        <Questions />
        <Closing />
      </MarketingMain>
    </PublicShell>
  );
}

function Hero() {
  const start = useStartLinks();
  return (
    <section aria-labelledby="hero-title" className="flex flex-col gap-6 pt-10 md:pt-16">
      <p className="y-eyebrow">How it works</p>
      <h1 id="hero-title" className="y-display y-hero -mt-2 max-w-[16ch] text-balance">
        Simple to order, safe to pay.
      </h1>
      <p className="y-lead y-fg-2 max-w-[56ch]">
        The steps from brief to video, what it costs, and how your payment is protected. One account
        orders videos and makes them.
      </p>
      <div className="flex flex-wrap gap-2">
        <PillButton href={start.order()} variant="neon" size="lg" arrow>
          Get videos made
        </PillButton>
        <PillButton href={paths.discover()} variant="outline" size="lg">
          Browse creators
        </PillButton>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Steps for each way of ordering                                              */
/* -------------------------------------------------------------------------- */

type Way = "direct" | "custom" | "campaign";

function stepsFor(way: Way, facts: ReturnType<typeof campaignFacts>, days: number) {
  if (way === "direct") {
    return [
      { title: "Find a creator", body: "Watch their videos and read their reviews. Filter by format, language and price." },
      { title: "Choose a package", body: "Each package states its price and turnaround. Two revisions, raw footage and the usage you pick are included." },
      { title: "Pay into protection", body: "You pay the package price, nothing on top. Your card is authorized now and charged when they accept." },
      { title: "Review with comments", body: `A first version in about ${days} days. Comment at the exact second that needs work, and the creator replies.` },
      { title: "Approve, and order again", body: "The creator is paid, the video lands in your library, and what you learned carries into the next brief." },
    ];
  }
  if (way === "custom") {
    return [
      { title: "Add your product once", body: "Audience, tone, dos and don'ts. Every order reuses it." },
      {
        title: "Post a custom order",
        body: `A video or ad copy, the usage you need, a budget from ${money(BUDGET_MIN)} and a delivery deadline of ${ORDER_DEADLINE_OPTIONS[0]} to ${ORDER_DEADLINE_OPTIONS[ORDER_DEADLINE_OPTIONS.length - 1]} days. It takes pitches for ${ORDER_OPEN_DAYS} days.`,
      },
      { title: "Compare pitches", body: "Each one has an idea, a price within your budget, a turnaround and a sample. Shortlist and compare side by side." },
      { title: "Hire and pay into protection", body: "You pay the price in the pitch, nothing on top. Yapp holds it, not the creator, until you approve." },
      { title: "Review with comments", body: "Point at exact moments; the creator answers in the same thread. Two revisions are included." },
      { title: "Approve, and order again", body: "You get the final file and the raw footage, and what you learned carries into the next brief." },
    ];
  }
  return [
    { title: "Say what to say", body: "Your product, talking points, what to avoid, and your account to tag on each platform." },
    {
      title: "Set the price and the tier",
      body: `${facts.minVideos} or more Yapps, in steps of ${facts.step}. You set the price per Yapp, from ${money(facts.fromPrice)}; the follower tier decides who can pick.`,
    },
    { title: "Hold the full amount", body: `Yapps × your price, nothing on top, held when you post. Creators can pick for ${facts.openDays} days.` },
    { title: "Creators pick now", body: "First come, first served. Each creator picks one Yapp and posts on one of your platforms." },
    { title: "Review each copy", body: "Approve, request changes or reject. A rejected video reopens its Yapp and the money stays held." },
    {
      title: "They post it",
      body: `On their own account, tagging you, with the paid-partnership label. Yapp checks the post and pays them ${facts.releaseDays} days later if it's still up.`,
    },
  ];
}

const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

function Steps() {
  const s = useDemo();
  const stats = platformStats(s);
  const facts = campaignFacts();
  // `#campaigns` opens the campaign steps.
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => "");
  const [picked, setPicked] = useState<Way | null>(null);
  const way: Way = picked ?? (hash === "campaigns" ? "campaign" : "direct");
  const list = stepsFor(way, facts, stats.firstDeliveryDays);
  const sub: Record<Way, string> = {
    direct: "You know who you want: order a package straight from their profile.",
    custom: "Not sure who fits? Post a custom order and creators pitch on it.",
    campaign: `Need ${facts.minVideos} or more videos posted by different creators? Run a UGC campaign.`,
  };
  return (
    <Section id="steps" title="From brief to approved video" sub={sub[way]}>
      <div id="campaigns" className="flex scroll-mt-28 flex-col gap-4">
        <Tabs<Way>
          label="Ways to order"
          value={way}
          onSelect={setPicked}
          items={[
            { id: "direct", label: "Pick a creator" },
            { id: "custom", label: "Custom order" },
            { id: "campaign", label: "UGC campaign" },
          ]}
        />
        <Block tone="paper" pad="lg">
          <ol className="grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
            {list.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-3">
                <StepNumber n={index + 1} />
                <h3 className="y-head">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="y-body y-fg-2 max-w-[40ch]">{step.body}</p>
              </li>
            ))}
          </ol>
        </Block>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Pricing                                                                     */
/* -------------------------------------------------------------------------- */

function Pricing() {
  return (
    <Section
      id="pricing"
      title="Clear prices. Nothing added on top."
      sub={`No subscription, and posting an order is free. You pay the listed price: Yapp's ${FEE_PCT}% comes out of the creator's side, never yours. It's charged when you hire or post a campaign, held until you approve, and a refund returns all of it.`}
    >
      <div className="flex flex-col gap-3">
        <VisiblePrices />
        <FeeCalculator />
        <CampaignPrices />
      </div>
    </Section>
  );
}

/** Visible prices (round 3 answers, item 10): what is priced upfront, and what you set. */
function VisiblePrices() {
  return (
    <Block tone="paper" pad="md" className="flex items-start gap-3">
      <IconTile>
        <Eye size={20} />
      </IconTile>
      <div className="flex flex-col gap-1">
        <h3 className="y-head">Visible prices</h3>
        <p className="y-small y-fg-2 max-w-[70ch]">
          Campaigns and creator packages show their price upfront. For a custom order, you set the budget and
          creators pitch within it.
        </p>
      </div>
    </Block>
  );
}

/**
 * UGC campaign prices: the brand sets the price per Yapp. Each follower tier only decides who can
 * pick; the usual range beside it is the guidance from lib/pricing.ts (no category chosen).
 */
function CampaignPrices() {
  const facts = campaignFacts();
  const example = campaignBudget(facts.minVideos, facts.exampleRange.low);
  return (
    <Block tone="paper" pad="lg" className="grid gap-6 lg:grid-cols-12 lg:items-center">
      <div className="flex flex-col gap-2 lg:col-span-5">
        <h3 className="y-display y-title">UGC campaigns</h3>
        <p className="y-small y-fg-2 max-w-[44ch]">
          You set one price per Yapp, from {money(facts.fromPrice)}. The follower tier decides who can pick; the
          range beside it is a guide, never a rule. {facts.minVideos} Yapps minimum, in steps of {facts.step}. The
          full amount is held when you post, and Yapps nobody picks are refunded when the campaign closes.
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-(--b-line) lg:col-span-7" aria-label="Follower tiers and usual prices">
        {facts.tiers.map((tier) => {
          const range = priceGuidance(undefined, tier.id);
          return (
            <li key={tier.id} className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <span className="y-small">{tier.label} followers</span>
              <span className="y-small y-num y-fg-2">
                usually <span className="font-semibold text-(--b-fg)">{moneyRange(range.low, range.high)}</span> a Yapp
              </span>
            </li>
          );
        })}
        <li className="y-small y-fg-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 last:pb-0">
          <span>
            Example: {example.videos} Yapps at {money(example.pricePerVideo)}
          </span>
          <span className="y-num">
            {money(example.total)} held when you post · each creator earns {moneyExact(example.perCreator)}
          </span>
        </li>
      </ul>
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* Protection                                                                  */
/* -------------------------------------------------------------------------- */

const protectionFlow = [
  { title: "Held", body: "You pay when work starts. Yapp holds it." },
  { title: "Delivered", body: "The creator uploads a version." },
  { title: "Reviewed", body: `Approve or request changes within ${AUTO_APPROVE_DAYS} days.` },
  { title: "Released", body: "The creator is paid. You get the files." },
];

function Protection() {
  return (
    <Section
      id="protection"
      title="Protected on every order"
      sub="You never pay for a video you didn't get, and creators never wait on a client who went quiet."
    >
      <Block tone="paper" pad="lg" className="grid gap-10 lg:grid-cols-12 lg:gap-10">
        <div className="flex flex-col gap-8 lg:col-span-7">
          <div className="flex items-center gap-3">
            <IconTile>
              <ShieldCheck size={20} />
            </IconTile>
            <h3 className="y-display y-title">Payment is held until you approve</h3>
          </div>
          <ol className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-4" aria-label="How a protected payment moves">
            {protectionFlow.map((stage, index) => (
              <li key={stage.title} className="flex flex-col gap-2">
                <StepNumber n={index + 1} />
                <span className="y-small font-semibold">{stage.title}</span>
                <span className="y-small y-fg-2">{stage.body}</span>
              </li>
            ))}
          </ol>
        </div>
        <CheckList
          size="small"
          className="lg:col-span-5 lg:justify-center"
          items={[
            "Everything you paid comes back if the creator doesn't deliver",
            `Approves itself ${AUTO_APPROVE_DAYS} days after delivery, with reminders 48, 24 and 2 hours before`,
            "Two revisions included; after that, approve, agree a paid extra revision, or open a dispute",
            "Campaigns: a rejected video reopens its Yapp, and the money stays held",
            "Can't agree? A person at Yapp replies within 48 hours and decides",
          ]}
        />
      </Block>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* FAQ and the end of the page                                                 */
/* -------------------------------------------------------------------------- */

function Questions() {
  const s = useDemo();
  const faq = brandFaq(s);
  return (
    <Section id="faq" title="Questions, answered">
      <Block tone="paper" pad="lg" className="!py-2 md:!py-3">
        <Faq items={Object.values(faq)} />
      </Block>
    </Section>
  );
}

function Closing() {
  const start = useStartLinks();
  return (
    <Section id="next" className="pb-6">
      <div className="grid gap-3 lg:grid-cols-2">
        <Block tone="paper" pad="lg" className="flex flex-col items-start gap-4">
          <h2 className="y-display y-title">Ready for your first video?</h2>
          <p className="y-body y-fg-2">Post a custom order, run a UGC campaign, or pick a creator whose videos you like.</p>
          <PillButton href={start.order(paths.newOrder())} variant="contrast" arrow>
            Start an order
          </PillButton>
        </Block>
        <Block tone="paper" pad="lg" className="flex flex-col items-start gap-4">
          <h2 className="y-display y-title">Making videos too?</h2>
          <p className="y-body y-fg-2">
            Same account. Creators earn {100 - FEE_PCT}% of every price, secured before they film.
          </p>
          <PillButton href={paths.forCreators} variant="outline" arrow>
            Read the creator guide
          </PillButton>
        </Block>
      </div>
    </Section>
  );
}
