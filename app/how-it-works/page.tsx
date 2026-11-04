"use client";

import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileText,
  LifeBuoy,
  Megaphone,
  MessageSquareText,
  Package,
  Repeat2,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Undo2,
} from "lucide-react";

import {
  CheckList,
  Faq,
  type FaqItem,
  IconTile,
  MarketingMain,
  SectionHeader,
  StepNumber,
} from "@/components/marketing/blocks";
import { FeeCalculator } from "@/components/marketing/calculators";
import {
  MARKETING,
  median,
  platformStats,
  typicalAddonPrices,
} from "@/components/marketing/platform";
import { type SectionLink, SectionNav } from "@/components/marketing/section-nav";
import { MiniLearnings, MiniPitches, MiniReview } from "@/components/marketing/snippets";
import { PublicShell } from "@/components/shell/app-shell";
import { Block, type BlockTone } from "@/components/ui/block";
import { Cast, teamCast } from "@/components/ui/character";
import { PillButton } from "@/components/ui/pill-button";
import { money } from "@/lib/format";
import { startingPrice } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { AUTO_APPROVE_DAYS, includedRights, SERVICE_FEE_RATE } from "@/lib/taxonomy";
import type { PackageTier } from "@/lib/types";

const FEE_PCT = Math.round(SERVICE_FEE_RATE * 100);

const sections: SectionLink[] = [
  { id: "business", label: "For businesses" },
  { id: "creators", label: "For creators" },
  { id: "pricing", label: "Pricing" },
  { id: "protection", label: "Protection" },
  { id: "faq", label: "FAQ" },
];

export default function HowItWorksPage() {
  return (
    <PublicShell>
      <MarketingMain>
        <Hero />
        <SectionNav items={sections} label="On this page" className="mt-4" />
        <Business />
        <Creators />
        <Pricing />
        <Protection />
        <FaqSection />
        <FinalCta />
      </MarketingMain>
    </PublicShell>
  );
}

/* -------------------------------------------------------------------------- */

function Hero() {
  const glance = [
    { icon: <Sparkles size={18} />, text: "No subscription. Pay per commission" },
    { icon: <BadgeCheck size={18} />, text: `${FEE_PCT}% service fee, charged only when you approve` },
    { icon: <ShieldCheck size={18} />, text: "Payment held until you approve the video" },
    { icon: <Undo2 size={18} />, text: "Full refund if the creator doesn't deliver" },
    { icon: <Megaphone size={18} />, text: "Organic use on your accounts, forever" },
  ];
  return (
    <section aria-labelledby="hero-title" className="grid gap-2 lg:grid-cols-12">
      <Block tone="paper" pad="lg" className="flex flex-col justify-between gap-10 lg:col-span-8">
        <div className="flex flex-col gap-6">
          <p className="y-chip w-fit">How it works · Pricing · Protection</p>
          <h1 id="hero-title" className="y-display y-hero max-sm:!text-[2.6rem] lg:!text-[4.75rem]">
            Simple to brief, <span className="y-strong">safe to pay</span>
          </h1>
          <p className="y-lead y-fg-2 max-w-[58ch]">
            Everything about getting a video made on Yapp: the steps from brief to published
            video, what it costs, how your payment is protected, and what you can do with the
            result.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PillButton href="/creators" variant="neon" size="lg" arrow>
            Find a creator
          </PillButton>
          <PillButton href="/business/requests/new" variant="outline" size="lg">
            Post a request
          </PillButton>
        </div>
      </Block>
      <Block tone="night" pad="lg" className="flex flex-col gap-6 lg:col-span-4">
        <h2 className="y-head">At a glance</h2>
        <ul className="flex flex-col gap-4">
          {glance.map((item) => (
            <li key={item.text} className="flex items-center gap-3">
              <IconTile size="sm">{item.icon}</IconTile>
              <span className="y-small">{item.text}</span>
            </li>
          ))}
        </ul>
      </Block>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* For businesses                                                              */
/* -------------------------------------------------------------------------- */

type Step = {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone?: BlockTone;
  extra?: React.ReactNode;
  link?: { href: string; label: string };
};

function Business() {
  const s = useDemo();
  const stats = platformStats(s);
  const typical = typicalAddonPrices(s);
  const rounds = (tier: PackageTier) =>
    median(s.creators.flatMap((c) => c.packages.filter((p) => p.tier === tier).map((p) => p.revisions)));
  const roundsLabel = (count: number) => (count === 1 ? "1 round" : `${count} rounds`);

  const steps: Step[] = [
    {
      icon: <Package size={20} />,
      title: "Add your product once",
      body: "Save who it's for, the problem it solves, your tone, dos and don'ts, logo, screens and a demo account. Every brief and commission reuses it.",
      extra: (
        <CheckList
          size="small"
          items={["Audience and the problem it solves", "Tone, dos and don'ts", "Logo, screens and demo account"]}
        />
      ),
      link: { href: "/business/products/new", label: "Add a product" },
    },
    {
      icon: <FileText size={20} />,
      title: "Post a request, or commission directly",
      body: "Describe the format, dialect, platforms, budget and date, and creators pitch. Or open a creator's profile, pick a package and send an offer straight away.",
      extra: (
        <div className="grid grid-cols-2 gap-2">
          <div className="y-tile flex flex-col gap-1 p-3">
            <Send size={16} aria-hidden className="y-flip" />
            <span className="y-small font-semibold">Request</span>
            <span className="y-micro y-fg-2">Creators come to you with pitches</span>
          </div>
          <div className="y-tile flex flex-col gap-1 p-3">
            <Search size={16} aria-hidden />
            <span className="y-small font-semibold">Direct</span>
            <span className="y-micro y-fg-2">Pick a package from a profile</span>
          </div>
        </div>
      ),
      link: { href: "/business/requests/new", label: "Start a request" },
    },
    {
      icon: <Send size={20} className="y-flip" />,
      title: "Compare pitches",
      body: "Each pitch has an angle for your video, a fixed price, a turnaround and samples of similar work. Shortlist, message and compare side by side.",
      extra: <MiniPitches count={2} tone="mist" />,
    },
    {
      icon: <ShieldCheck size={20} />,
      tone: "sky",
      title: "Hire with a protected payment",
      body: "Accept a pitch or have your offer accepted, then pay. The money is held by Yapp, not the creator, until you approve the final video.",
      extra: (
        <CheckList
          size="small"
          items={[
            "Held safely while the creator works",
            "Full refund if it isn't delivered",
            `The ${FEE_PCT}% fee is only charged at the end`,
          ]}
        />
      ),
    },
    {
      icon: <MessageSquareText size={20} />,
      title: "Review with timestamped notes",
      body: "Watch the delivery and leave notes at exact moments, like “0:12, slow down here”. The creator sees every note on the timeline, so nothing gets lost in chat.",
      extra: <MiniReview tone="mist" />,
    },
    {
      icon: <RotateCcw size={20} />,
      title: "Revisions, included per package",
      body: "Every package states its revision rounds, usually one or two. Each version is kept so you can compare, and you can add a round if you need one.",
      extra: (
        <dl className="flex flex-col gap-2">
          {[
            ["Typical basic package", roundsLabel(rounds("basic"))],
            ["Typical standard package", roundsLabel(rounds("standard"))],
            ["Extra round add-on", `about ${money(typical["extra-revision"])}`],
          ].map(([term, value]) => (
            <div key={term} className="y-tile flex items-center justify-between gap-3 px-4 py-3">
              <dt className="y-small">{term}</dt>
              <dd className="y-small y-num font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    {
      icon: <CheckCircle2 size={20} />,
      title: "Approve and release payment",
      body: `Approve when it's right: the creator is paid, you get the final files and a receipt. If you don't respond within ${AUTO_APPROVE_DAYS} days of a delivery, it's approved automatically. We remind you first.`,
      extra: (
        <CheckList
          size="small"
          items={["Final files, with and without captions", "Organic use on your accounts, forever", "A receipt in Billing"]}
        />
      ),
    },
    {
      icon: <Sparkles size={20} />,
      tone: "lavender",
      title: "Review, and keep what you learned",
      body: "Rate the creator and note what worked. Learnings are saved to the product and included in every future brief, whoever makes the next video.",
      extra: <MiniLearnings max={2} />,
    },
    {
      icon: <Repeat2 size={20} />,
      tone: "night",
      title: "Commission again",
      body: "Rehire the same creator in two clicks with the brief filled in, or brief someone new who starts with everything you've learned so far.",
      extra: (
        <p className="y-small y-fg-2">
          Teams on Yapp come back: creators here have a median repeat-client rate of{" "}
          <span className="y-num font-semibold text-(--b-fg)">{stats.repeatPct}%</span>.
        </p>
      ),
      link: { href: "/business/commissions", label: "See your commissions" },
    },
  ];

  return (
    <section id="business" aria-labelledby="business-title" className="scroll-mt-28">
      <SectionHeader
        id="business-title"
        kicker="For businesses"
        title={
          <>
            From brief to <span className="y-strong">published video</span>
          </>
        }
        sub={`Nine steps, most of them a click. The median first version arrives in ${stats.firstDeliveryDays} days.`}
      />
      <ol className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title}>
            <Block tone={step.tone ?? "paper"} pad="md" className="flex h-full flex-col gap-5">
              <div className="flex items-center justify-between gap-3">
                <StepNumber n={index + 1} className="text-[44px]" />
                <IconTile>{step.icon}</IconTile>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="y-display y-title">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="y-body y-fg-2">{step.body}</p>
              </div>
              {step.extra ? <div className="mt-auto">{step.extra}</div> : null}
              {step.link ? (
                <PillButton
                  href={step.link.href}
                  variant={step.tone === "night" ? "contrast" : "soft"}
                  size="sm"
                  arrow
                  className={`w-fit ${step.extra ? "" : "mt-auto"}`}
                >
                  {step.link.label}
                </PillButton>
              ) : null}
            </Block>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* For creators (short)                                                        */
/* -------------------------------------------------------------------------- */

function Creators() {
  const creatorSteps = [
    {
      title: "Build your profile",
      body: "Portfolio, dialects, formats and packages with your own prices.",
    },
    {
      title: "Pitch or accept offers",
      body: "Pitch on requests that fit, or accept direct offers. Payment is secured before you start.",
    },
    {
      title: "Deliver and get paid",
      body: `Paid when the client approves, or automatically ${AUTO_APPROVE_DAYS} days after delivery. Keep 100% of your price.`,
    },
  ];
  return (
    <section id="creators" aria-labelledby="creators-title" className="scroll-mt-28">
      <SectionHeader
        id="creators-title"
        kicker="For creators"
        title={
          <>
            Clear briefs, <span className="y-strong">reliable pay</span>
          </>
        }
        sub="Creators get expectations in writing, a secured payment before filming, and clients who come back."
        action={
          <PillButton href="/for-creators" variant="contrast" arrow>
            Read the creator guide
          </PillButton>
        }
      />
      <ol className="grid gap-2 md:grid-cols-3">
        {creatorSteps.map((step, index) => (
          <li key={step.title}>
            <Block tone="paper" pad="md" className="flex h-full flex-col gap-4">
              <StepNumber n={index + 1} className="text-[44px]" />
              <h3 className="y-head">
                <span className="sr-only">Step {index + 1}: </span>
                {step.title}
              </h3>
              <p className="y-small y-fg-2">{step.body}</p>
            </Block>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Pricing                                                                     */
/* -------------------------------------------------------------------------- */

function Pricing() {
  const s = useDemo();
  const stats = platformStats(s);
  const prices = s.creators.map((c) => startingPrice(c));
  const lowest = prices.length ? Math.min(...prices) : 0;
  const facts = [
    { value: "$0", label: "to join, browse or post a request. No subscription." },
    { value: `${FEE_PCT}%`, label: "service fee, paid by the business only when work completes." },
    { value: "100%", label: "of the price and add-ons goes to the creator." },
    {
      value: lowest ? money(lowest) : "—",
      label: `starting price on Yapp today. The median creator starts at ${money(stats.startingPrice)}.`,
    },
  ];
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-28">
      <SectionHeader
        id="pricing-title"
        kicker="Pricing"
        title={
          <>
            Creators set prices. <span className="y-strong">You see every dollar.</span>
          </>
        }
        sub="There's no subscription and no charge for posting. You pay the creator's price, any add-ons you choose, and a service fee when the work is approved."
      />
      <div className="flex flex-col gap-2">
        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {facts.map((fact) => (
            <li key={fact.label}>
              <Block tone="paper" pad="md" className="flex h-full flex-col justify-between gap-6">
                <span className="y-display y-num text-[44px] leading-none font-semibold tracking-[-0.04em] md:text-[56px]">
                  {fact.value}
                </span>
                <span className="y-small y-fg-2 max-w-[28ch]">{fact.label}</span>
              </Block>
            </li>
          ))}
        </ul>
        <FeeCalculator />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Protection                                                                  */
/* -------------------------------------------------------------------------- */

const protectionFlow = [
  { title: "Funded", body: "You pay when the creator starts. Yapp holds it." },
  { title: "Delivered", body: "The creator uploads a version for your review." },
  {
    title: "Reviewed",
    body: `Approve or ask for changes within ${AUTO_APPROVE_DAYS} days.`,
  },
  { title: "Released", body: "The creator is paid. You get the files." },
];

function Protection() {
  const s = useDemo();
  const typical = typicalAddonPrices(s);
  return (
    <section id="protection" aria-labelledby="protection-title" className="scroll-mt-28">
      <SectionHeader
        id="protection-title"
        kicker="Protection"
        title={
          <>
            Protected on <span className="y-strong">every commission</span>
          </>
        }
        sub="You never pay for a video you didn't get, and creators never wait on a client who went quiet."
      />
      <div className="grid gap-2 lg:grid-cols-12">
        <Block tone="sky" pad="lg" className="flex flex-col gap-8 lg:col-span-7">
          <div className="flex flex-col gap-3">
            <IconTile>
              <ShieldCheck size={22} />
            </IconTile>
            <h3 className="y-display y-title">Payment is held until you approve</h3>
            <p className="y-body y-fg-2 max-w-[56ch]">
              Your payment never goes straight to the creator. It&apos;s held by Yapp while they
              work and released only when you approve the video.
            </p>
          </div>
          <ol className="grid gap-2 sm:grid-cols-4" aria-label="How a protected payment moves">
            {protectionFlow.map((stage, index) => (
              <li
                key={stage.title}
                data-tone="paper"
                className="y-block flex flex-col gap-2 !rounded-(--y-r-tile) p-4"
              >
                <span
                  aria-hidden
                  className="y-num grid size-8 place-items-center rounded-full bg-(--b-fg) text-[13px] font-semibold text-(--b-bg)"
                >
                  {index + 1}
                </span>
                <span className="y-small font-semibold">{stage.title}</span>
                <span className="y-micro y-fg-2">{stage.body}</span>
              </li>
            ))}
          </ol>
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: <Undo2 size={18} />,
                title: "Full refund if not delivered",
                body: "If the creator misses the deadline and doesn't deliver, cancel for a full refund. No fee is charged.",
              },
              {
                icon: <Clock size={18} />,
                title: `Auto-approve after ${AUTO_APPROVE_DAYS} days`,
                body: "If you don't respond to a delivery, it's approved so the creator is paid. We remind you before it happens.",
              },
              {
                icon: <LifeBuoy size={18} />,
                title: "Yapp support resolves disputes",
                body: "Can't agree? Open a resolution. A person reviews the brief, messages and deliveries, and decides on a refund in full, in part, or release.",
              },
              {
                icon: <BadgeCheck size={18} />,
                title: "Verified on both sides",
                body: "Creators verify their ID and businesses verify a payment method before work starts.",
              },
            ].map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <IconTile size="sm">{item.icon}</IconTile>
                <span className="flex flex-col gap-1">
                  <span className="y-small font-semibold">{item.title}</span>
                  <span className="y-small y-fg-2">{item.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </Block>

        <Block tone="paper" pad="lg" className="flex flex-col gap-6 lg:col-span-5">
          <div className="flex flex-col gap-3">
            <IconTile>
              <Megaphone size={22} />
            </IconTile>
            <h3 className="y-display y-title">Usage rights, in plain words</h3>
          </div>
          <div className="flex flex-col gap-2">
            <p className="y-micro y-fg-2">Always included</p>
            <div className="y-tile flex items-start gap-3 p-4">
              <CheckCircle2 size={18} aria-hidden className="mt-0.5 flex-none" />
              <span className="y-small">{includedRights}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="y-micro y-fg-2">Add-ons, priced by each creator</p>
            <dl className="flex flex-col gap-2">
              {(
                [
                  ["Paid ads usage · 90 days", typical["ad-rights-90"]],
                  ["Paid ads usage · 12 months", typical["ad-rights-365"]],
                  ["Post to the creator's own account", typical["post-to-account"]],
                ] as const
              ).map(([term, price]) => (
                <div key={term} className="y-tile flex items-center justify-between gap-3 px-4 py-3">
                  <dt className="y-small">{term}</dt>
                  <dd className="y-small y-num y-fg-2 flex-none">from ~{money(price)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="y-small y-fg-2 mt-auto">
            Creators can show finished work in their Yapp portfolio unless your brief asks them to
            keep it private.
          </p>
        </Block>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* FAQ                                                                         */
/* -------------------------------------------------------------------------- */

function FaqSection() {
  const s = useDemo();
  const stats = platformStats(s);
  const typical = typicalAddonPrices(s);
  const items: FaqItem[] = [
    {
      q: "Who owns the videos, and where can I use them?",
      a: (
        <>
          <p>
            You own the final files and can use them on your own accounts, website and app,
            forever. Running a video as a paid ad needs the paid-ads usage add-on, for 90 days or
            12 months.
          </p>
          <p>Raw footage is an add-on too, if your team wants to recut later.</p>
        </>
      ),
    },
    {
      q: "How many revisions do I get?",
      a: `It depends on the package: most include one or two rounds, and the number is shown before you pay. Each round should point at what the brief asked for. If you want more, an extra round typically costs around ${money(typical["extra-revision"])}.`,
    },
    {
      q: "What if I don't like the video?",
      a: "Use your revision rounds and leave notes at the exact moments that need work. If a delivery still doesn't match the agreed brief, open a resolution from the commission. Yapp support reviews the brief, messages and versions, and can refund you in full or in part.",
    },
    {
      q: "Can I choose the dialect?",
      a: "Yes. Filter creators by dialect, and set the languages in your brief. Creators only list dialects they speak natively. Want the same video in Saudi and Egyptian? Ask for two versions, or hire two creators from the same request.",
    },
    {
      q: "Can creators post the video on their own accounts?",
      a: "Only if you add “Post to creator's account”, which some creators with an audience offer. Otherwise the video is yours to publish, and the creator won't post it.",
    },
    {
      q: "Do I need to write a script?",
      a: "No. Describe the goal, the key message and what to avoid. Creators propose an angle in their pitch and usually draft the script with you before filming.",
    },
    {
      q: "How quickly will I get a video?",
      a: `The median creator delivers a first version in ${stats.firstDeliveryDays} days, and every package shows its turnaround. Rush delivery is available from many creators as an add-on.`,
    },
    {
      q: "When are creators paid?",
      a: `When you approve the delivery, or automatically ${AUTO_APPROVE_DAYS} days after it if you don't respond. Creators then withdraw to a bank or wallet, usually within ${MARKETING.payoutTime}.`,
    },
    {
      q: "Can I cancel a commission?",
      a: "Direct offers can be withdrawn free until the creator accepts. After that, cancel by agreement with the creator for a refund, or automatically in full if they miss the deadline without delivering. If you can't agree, Yapp support decides.",
    },
    {
      q: "Do you provide invoices? What about VAT?",
      a: "Every payment creates an invoice in Billing with your company details, which you can download for your accounts. Prices are in US dollars. Where VAT applies to Yapp's service fee, it's added and shown separately on the invoice.",
    },
    {
      q: "Is there a subscription or a minimum spend?",
      a: "No. Posting requests and browsing creators is free. You only pay when you hire, and the service fee only when the work is approved.",
    },
    {
      q: "What should I give the creator?",
      a: "Add your product once: audience, tone, dos and don'ts, logo, screens and, ideally, a demo account. It's attached to every brief automatically, along with learnings from past videos.",
    },
  ];
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-28">
      <SectionHeader
        id="faq-title"
        kicker="FAQ"
        title={
          <>
            Questions, <span className="y-strong">answered</span>
          </>
        }
      />
      <Block tone="paper" pad="lg" className="py-2 md:py-4">
        <Faq items={items} />
      </Block>
    </section>
  );
}

function FinalCta() {
  return (
    <section aria-labelledby="hiw-cta-title" className="mt-16 md:mt-24">
      <Block tone="butter" pad="none" className="grid overflow-hidden lg:grid-cols-12">
        <div className="flex flex-col gap-8 p-6 md:p-10 lg:col-span-8">
          <h2 id="hiw-cta-title" className="y-display y-t-display max-w-[18ch]">
            Ready for your first video? <span className="y-strong">Start with a brief.</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            <PillButton href="/business/requests/new" variant="contrast" size="lg" arrow>
              Post a request
            </PillButton>
            <PillButton href="/creators" variant="outline" size="lg">
              Browse creators
            </PillButton>
          </div>
        </div>
        <div className="flex items-end justify-center px-6 pt-2 lg:col-span-4 lg:px-10">
          <Cast members={teamCast} viewBox="-8 6 202 106" className="block h-auto w-full max-w-[280px]" />
        </div>
      </Block>
    </section>
  );
}
