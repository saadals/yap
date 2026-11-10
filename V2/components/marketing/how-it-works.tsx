"use client";

import { ShieldCheck } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { PublicShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { PillButton } from "@/components/ui/pill-button";
import { Tabs } from "@/components/ui/tabs";
import { money } from "@/lib/format";
import { paths } from "@/lib/paths";
import { useDemo } from "@/lib/store";
import { AUTO_APPROVE_DAYS, SERVICE_FEE_RATE } from "@/lib/taxonomy";

import { CheckList, Faq, IconTile, MarketingMain, Section, StepNumber, useStartLinks } from "./blocks";
import { FeeCalculator } from "./calculators";
import { brandFaq } from "./faq-content";
import { campaignFacts, platformStats } from "./platform";
import { type SectionLink, SectionNav } from "./section-nav";

const FEE_PCT = Math.round(SERVICE_FEE_RATE * 100);

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
      { title: "Choose a package", body: "Each package states the price, the turnaround and the revisions included." },
      { title: "Pay into protection", body: "Your card is authorized now and charged when they accept. Yapp holds it." },
      { title: "Review with notes", body: `A first version in about ${days} days. Leave notes at the exact second that needs work.` },
      { title: "Approve, and order again", body: "The creator is paid, the video lands in your library, and what you learned carries into the next brief." },
    ];
  }
  if (way === "custom") {
    return [
      { title: "Add your product once", body: "Audience, tone, dos and don'ts. Every brief reuses it." },
      { title: "Post a brief", body: "The format, the language, the budget and the deadline. Creators who fit are told about it." },
      { title: "Compare pitches", body: "Each one has an idea, a fixed price, a turnaround and a sample. Shortlist and compare side by side." },
      { title: "Hire and pay into protection", body: "Yapp holds the payment, not the creator, until you approve." },
      { title: "Review with notes", body: "Point at exact moments. Revision rounds are included in the price." },
      { title: "Approve, and order again", body: "The creator is paid and what you learned carries into the next brief." },
    ];
  }
  return [
    { title: "Say what to say", body: "Your product, talking points, what to avoid, and the brand account to tag." },
    { title: "Pick videos and a tier", body: `${facts.minVideos} or more videos, in steps of ${facts.step}. The follower tier sets one fixed price per video.` },
    { title: "Hold the budget", body: `Videos × price, plus the ${facts.feePct}% service fee, held up front. It stays open for ${facts.openDays} days.` },
    { title: "Creators take slots", body: "First come, first served, and every video comes from a different creator." },
    { title: "Review each copy", body: "Approve, ask for changes or reject. A rejected video reopens its slot and the money stays held." },
    { title: "They post it", body: `On their own account, tagging you, with the paid-partnership label. Yapp checks the post and pays them ${facts.releaseDays} days later if it's still up.` },
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
    custom: "Not sure who fits? Post a brief and creators pitch on it.",
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
            { id: "custom", label: "Get pitches" },
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
      title="Clear prices. You see every dollar."
      sub={`No subscription, and posting a brief is free. Every order is the creator's price plus a ${FEE_PCT}% service fee, charged when you hire or post a campaign and held until the work is released. A refund returns the fee too.`}
    >
      <div className="flex flex-col gap-3">
        <FeeCalculator />
        <CampaignPrices />
      </div>
    </Section>
  );
}

/** UGC campaign prices: the confirmed tiers. */
function CampaignPrices() {
  const facts = campaignFacts();
  return (
    <Block tone="paper" pad="lg" className="grid gap-6 lg:grid-cols-12 lg:items-center">
      <div className="flex flex-col gap-2 lg:col-span-5">
        <h3 className="y-display y-title">UGC campaigns</h3>
        <p className="y-small y-fg-2 max-w-[44ch]">
          A fixed price per video, set by the creator&apos;s verified followers. {facts.minVideos} videos
          minimum, in steps of {facts.step}. The total and the {facts.feePct}% fee are held up front; slots
          nobody takes are refunded with their fee.
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-(--b-line) lg:col-span-7">
        {facts.tiers.map((tier) => (
          <li key={tier.id} className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <span className="y-small">{tier.label} followers</span>
            <span className="y-num y-head">{money(tier.pricePerVideo)} a video</span>
          </li>
        ))}
        <li className="y-small y-fg-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 last:pb-0">
          <span>Example: {facts.minVideos} videos</span>
          <span className="y-num">
            {money(facts.minVideos * facts.fromPrice * (1 + facts.feePct / 100))} with the fee, held until each
            creator is paid
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
  { title: "Reviewed", body: `Approve or ask for changes within ${AUTO_APPROVE_DAYS} days.` },
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
            "Full refund, service fee included, if the creator doesn't deliver",
            `Approves itself ${AUTO_APPROVE_DAYS} days after delivery, with a reminder first`,
            "Campaigns: a rejected video reopens its slot, and the money stays held",
            "Can't agree? Yapp support reviews it and decides",
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
          <p className="y-body y-fg-2">Start with a short brief, or pick a creator whose videos you like.</p>
          <PillButton href={start.order(paths.newOrder())} variant="contrast" arrow>
            Start an order
          </PillButton>
        </Block>
        <Block tone="paper" pad="lg" className="flex flex-col items-start gap-4">
          <h2 className="y-display y-title">Making videos too?</h2>
          <p className="y-body y-fg-2">Same account. Creators keep 100% of their price, secured before they film.</p>
          <PillButton href={paths.forCreators} variant="outline" arrow>
            Read the creator guide
          </PillButton>
        </Block>
      </div>
    </Section>
  );
}
