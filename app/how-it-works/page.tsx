"use client";

import { ShieldCheck } from "lucide-react";

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
import { platformStats, typicalAddonPrices } from "@/components/marketing/platform";
import { type SectionLink, SectionNav } from "@/components/marketing/section-nav";
import { PublicShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { Cast, teamCast } from "@/components/ui/character";
import { PillButton } from "@/components/ui/pill-button";
import { money } from "@/lib/format";
import { useDemo } from "@/lib/store";
import { AUTO_APPROVE_DAYS, SERVICE_FEE_RATE } from "@/lib/taxonomy";

const FEE_PCT = Math.round(SERVICE_FEE_RATE * 100);

const sections: SectionLink[] = [
  { id: "business", label: "Steps" },
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
        <Pricing />
        <Protection />
        <FaqSection />
        <Creators />
        <FinalCta />
      </MarketingMain>
    </PublicShell>
  );
}

/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section aria-labelledby="hero-title">
      <Block tone="paper" pad="lg" className="flex flex-col gap-8 md:gap-10">
        <div className="flex flex-col gap-6">
          <h1 id="hero-title" className="y-display y-hero max-sm:!text-[2.6rem] lg:!text-[4.75rem]">
            Simple to brief, <span className="y-strong">safe to pay</span>
          </h1>
          <p className="y-lead y-fg-2 max-w-[52ch]">
            The steps from brief to video, what it costs, and how your payment is protected.
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
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* For businesses                                                              */
/* -------------------------------------------------------------------------- */

const businessSteps = [
  {
    title: "Add your product once",
    body: "Audience, tone, dos and don'ts. Every brief reuses it.",
  },
  {
    title: "Post a request, or hire directly",
    body: "Creators pitch on your request, or you pick a package from a profile.",
  },
  {
    title: "Compare pitches",
    body: "Each one has an angle, a fixed price, a turnaround and samples.",
  },
  {
    title: "Pay into protection",
    body: "Yapp holds your payment, not the creator, until you approve.",
  },
  {
    title: "Review with timestamped notes",
    body: "Point at exact moments. Revision rounds are included in the package.",
  },
  {
    title: "Approve, and commission again",
    body: "The creator is paid, you get the files, and what you learned carries into the next brief.",
  },
];

function Business() {
  const s = useDemo();
  const stats = platformStats(s);
  return (
    <section id="business" aria-labelledby="business-title" className="scroll-mt-28">
      <SectionHeader
        id="business-title"
        title={
          <>
            From brief to <span className="y-strong">published video</span>
          </>
        }
        sub={`Most steps are a click. The median first version arrives in ${stats.firstDeliveryDays} days.`}
      />
      <Block tone="paper" pad="lg">
        <ol className="grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {businessSteps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-3">
              <StepNumber n={index + 1} className="text-[44px]" />
              <h3 className="y-display y-title">
                <span className="sr-only">Step {index + 1}: </span>
                {step.title}
              </h3>
              <p className="y-body y-fg-2 max-w-[40ch]">{step.body}</p>
            </li>
          ))}
        </ol>
      </Block>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Pricing                                                                     */
/* -------------------------------------------------------------------------- */

function Pricing() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-28">
      <SectionHeader
        id="pricing-title"
        title={
          <>
            Creators set prices. <span className="y-strong">You see every dollar.</span>
          </>
        }
        sub={`No subscription, and posting is free. You pay the creator's price plus a ${FEE_PCT}% fee, charged only when you approve.`}
      />
      <FeeCalculator />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Protection                                                                  */
/* -------------------------------------------------------------------------- */

const protectionFlow = [
  { title: "Funded", body: "You pay when work starts. Yapp holds it." },
  { title: "Delivered", body: "The creator uploads a version." },
  { title: "Reviewed", body: `Approve or ask for changes within ${AUTO_APPROVE_DAYS} days.` },
  { title: "Released", body: "The creator is paid. You get the files." },
];

function Protection() {
  return (
    <section id="protection" aria-labelledby="protection-title" className="scroll-mt-28">
      <SectionHeader
        id="protection-title"
        title={
          <>
            Protected on <span className="y-strong">every commission</span>
          </>
        }
        sub="You never pay for a video you didn't get, and creators never wait on a client who went quiet."
      />
      <Block tone="sky" pad="lg" className="grid gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-8 lg:col-span-7">
          <div className="flex flex-col gap-3">
            <IconTile>
              <ShieldCheck size={22} />
            </IconTile>
            <h3 className="y-display y-title">Payment is held until you approve</h3>
          </div>
          <ol className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-4" aria-label="How a protected payment moves">
            {protectionFlow.map((stage, index) => (
              <li key={stage.title} className="flex flex-col gap-2">
                <span
                  aria-hidden
                  className="y-num grid size-8 place-items-center rounded-full bg-(--b-fg) text-[13px] font-semibold text-(--b-bg)"
                >
                  {index + 1}
                </span>
                <span className="y-small font-semibold">{stage.title}</span>
                <span className="y-small y-fg-2">{stage.body}</span>
              </li>
            ))}
          </ol>
        </div>
        <CheckList
          size="small"
          className="lg:col-span-5 lg:justify-end"
          items={[
            "Full refund if the creator doesn't deliver",
            `Auto-approves ${AUTO_APPROVE_DAYS} days after delivery, with a reminder first`,
            "Can't agree? Yapp support reviews it and decides",
            "Creators verify their ID, businesses a payment method",
          ]}
        />
      </Block>
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
            forever. Running a video as a paid ad needs the paid-ads usage add-on: typically about{" "}
            {money(typical["ad-rights-90"])} for 90 days or {money(typical["ad-rights-365"])} for
            12 months.
          </p>
          <p>
            Raw footage is an add-on too. Creators can show finished work in their portfolio
            unless your brief asks them to keep it private.
          </p>
        </>
      ),
    },
    {
      q: "How many revisions do I get?",
      a: `It depends on the package: most include one or two rounds, and the number is shown before you pay. If you want more, an extra round typically costs around ${money(typical["extra-revision"])}.`,
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
      a: `Only if you add “Post to creator's account” (typically from about ${money(typical["post-to-account"])}), which some creators with an audience offer. Otherwise the video is yours to publish.`,
    },
    {
      q: "Do I need to write a script?",
      a: "No. Describe the goal, the key message and what to avoid. Creators propose an angle in their pitch and usually draft the script with you before filming.",
    },
    {
      q: "How quickly will I get a video?",
      a: `The median creator delivers a first version in ${stats.firstDeliveryDays} days, and every package shows its turnaround. Many creators offer rush delivery as an add-on.`,
    },
    {
      q: "Can I cancel a commission?",
      a: "Direct offers can be withdrawn free until the creator accepts. After that, cancel by agreement with the creator for a refund, or automatically in full if they miss the deadline without delivering. If you can't agree, Yapp support decides.",
    },
    {
      q: "Do you provide invoices? What about VAT?",
      a: "Every payment creates an invoice in Billing with your company details. Prices are in US dollars. Where VAT applies to Yapp's service fee, it's shown separately on the invoice.",
    },
  ];
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-28">
      <SectionHeader
        id="faq-title"
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

/* -------------------------------------------------------------------------- */
/* For creators (a pointer to the creator guide)                               */
/* -------------------------------------------------------------------------- */

function Creators() {
  return (
    <section id="creators" aria-labelledby="creators-title" className="mt-16 scroll-mt-28 md:mt-24">
      <Block
        tone="paper"
        pad="lg"
        className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex flex-col gap-2">
          <h2 id="creators-title" className="y-display y-title">
            Making videos instead?
          </h2>
          <p className="y-body y-fg-2 max-w-[56ch]">
            Creators keep 100% of their price, with payment secured before they film.
          </p>
        </div>
        <PillButton href="/for-creators" variant="contrast" arrow className="w-fit flex-none">
          Read the creator guide
        </PillButton>
      </Block>
    </section>
  );
}

function FinalCta() {
  return (
    <section aria-labelledby="hiw-cta-title">
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
