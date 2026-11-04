"use client";

import { Gift, Mic, Wallet } from "lucide-react";
import Link from "next/link";

import { RequestCard } from "@/components/domain/request-card";
import { VideoThumb } from "@/components/domain/video-thumb";
import {
  Faq,
  type FaqItem,
  FloatWidget,
  IconTile,
  MarketingMain,
  SectionHeader,
  StepNumber,
} from "@/components/marketing/blocks";
import { EarningsEstimator } from "@/components/marketing/calculators";
import { MARKETING } from "@/components/marketing/platform";
import { PublicShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { Cast, duoCast } from "@/components/ui/character";
import { PillButton } from "@/components/ui/pill-button";
import { money } from "@/lib/format";
import { creatorById, featuredVideo } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { AUTO_APPROVE_DAYS, SERVICE_FEE_RATE } from "@/lib/taxonomy";

/** Creator whose work fronts the hero (an everyday presenter, to make the point). */
const HERO_CREATOR = "cr-hana";
const FEE_PCT = Math.round(SERVICE_FEE_RATE * 100);

const faq: FaqItem[] = [
  {
    q: "Do I need a lot of followers?",
    a: "No. Businesses hire you to make videos for their own accounts and ads, so they look at your portfolio, your reviews and how reliably you deliver. Followers only matter if you choose to offer posting to your own audience as an add-on.",
  },
  {
    q: "What does Yapp charge creators?",
    a: `Nothing. You keep 100% of your price and your add-ons. The business pays a ${FEE_PCT}% service fee on top, and only when the work is approved.`,
  },
  {
    q: "When do I get paid?",
    a: (
      <>
        <p>
          The client&apos;s payment is secured when the commission starts, before you film anything.
          It&apos;s released to your Yapp balance the moment they approve your delivery, or
          automatically {AUTO_APPROVE_DAYS} days after you deliver if they don&apos;t respond.
        </p>
        <p>
          Withdraw any time from {money(MARKETING.minimumPayout)} to a bank account or wallet.
          Transfers usually arrive in {MARKETING.payoutTime}.
        </p>
      </>
    ),
  },
  {
    q: "What if a client keeps asking for changes?",
    a: "Each package states how many revision rounds are included, and requests have to point at what was agreed in the brief. Extra rounds are a paid add-on you price yourself. If you can't agree, Yapp support reviews the brief and the delivery and decides.",
  },
  {
    q: "What if a client cancels after I've started?",
    a: "Once you've delivered, a client can't cancel; they can approve or ask for the revisions in your package. Before delivery, a cancellation needs your agreement or a decision from Yapp support, and work you've already done can be paid in part.",
  },
  {
    q: "Who owns the videos I make?",
    a: "The client can use the final video on their own accounts forever. Running it as a paid ad is a separate add-on that you price, for 90 days or 12 months. You can show the work in your Yapp portfolio unless the client asks you to keep it private.",
  },
  {
    q: "Can I also post the video on my own account?",
    a: "Only when the client buys the \"Post to creator's account\" add-on. It's optional, and you set the price based on your audience.",
  },
  {
    q: "Which languages and formats can I offer?",
    a: "Every Arabic dialect plus formal Fusha and English. List the dialects you're natural in and the formats you're good at: selfie demos, screen walkthroughs, honest reviews, skits, tutorials and ad hook packs.",
  },
];

export default function ForCreatorsPage() {
  return (
    <PublicShell>
      <MarketingMain>
        <Hero />
        <HowItWorksForCreators />
        <Payouts />
        <OpenRequests />
        <section aria-labelledby="faq-title">
          <SectionHeader
            id="faq-title"
            title={
              <>
                Questions creators <span className="y-strong">ask us</span>
              </>
            }
          />
          <Block tone="paper" pad="lg" className="py-2 md:py-4">
            <Faq items={faq} />
          </Block>
        </section>
        <FinalCta />
      </MarketingMain>
    </PublicShell>
  );
}

/* -------------------------------------------------------------------------- */

function Hero() {
  const s = useDemo();
  const creator = creatorById(s, HERO_CREATOR) ?? s.creators.find((c) => c.topRated);
  const video = creator ? featuredVideo(s, creator) : undefined;
  const basic = creator?.packages.find((p) => p.tier === "basic") ?? creator?.packages[0];

  return (
    <section aria-labelledby="hero-title" className="grid gap-2 lg:grid-cols-12">
      <Block
        tone="paper"
        pad="lg"
        className="flex flex-col justify-between gap-10 lg:col-span-7 lg:min-h-[560px]"
      >
        <div className="flex flex-col gap-6 md:gap-8">
          <p className="y-chip w-fit">
            <Mic size={14} aria-hidden />
            For presenters, video producers and influencers
          </p>
          <h1
            id="hero-title"
            className="y-display y-hero max-sm:!text-[2.6rem] lg:!text-[4rem] xl:!text-[4.75rem]"
          >
            Get paid to <span className="y-strong">talk about apps</span> you&apos;d actually use
          </h1>
          <p className="y-lead y-fg-2 max-w-[50ch]">
            App teams need people who explain their product naturally, in their customers&apos;
            dialect. Followers are optional; your portfolio is what gets you hired.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <PillButton href="/signup?role=creator" variant="neon" size="lg" arrow>
              Create your creator profile
            </PillButton>
            <PillButton href="#requests" variant="outline" size="lg">
              See open requests
            </PillButton>
          </div>
          <p className="y-small y-fg-2 flex items-start gap-2">
            <Gift size={16} aria-hidden className="mt-0.5 flex-none" />
            Free to join. You keep 100% of your price.
          </p>
        </div>
      </Block>

      <Block
        tone="butter"
        pad="none"
        className="relative isolate flex min-h-[520px] items-center justify-center overflow-hidden px-6 py-16 lg:col-span-5 lg:min-h-0"
      >
        {video && creator ? (
          <Link
            href={`/creators/${creator.handle}`}
            aria-label={`See ${creator.firstName}'s profile and portfolio: “${video.title}”`}
            className="group block w-[min(62%,264px)] rotate-2 rounded-(--y-r-tile) transition-transform duration-(--y-dur-2) hover:rotate-0"
          >
            <VideoThumb
              video={video}
              playable
              decorative
              className="shadow-[0_28px_56px_-24px_rgb(14_14_16/0.55)]"
            />
          </Link>
        ) : (
          <Cast members={duoCast} viewBox="-8 -8 154 148" className="w-1/2" />
        )}
        {creator && basic ? (
          <FloatWidget
            tone="paper"
            className="absolute end-4 bottom-6 md:end-7 md:bottom-8"
            icon={
              <IconTile>
                <Wallet size={20} />
              </IconTile>
            }
            title={`${money(basic.price)} released to ${creator.firstName}`}
            sub="Approved by the client · Paid to bank"
          />
        ) : null}
      </Block>
    </section>
  );
}

const creatorSteps = [
  {
    title: "Build your profile",
    body: "Your best videos, the dialects you speak, the formats you make, and your own prices.",
  },
  {
    title: "Pitch or accept offers",
    body: "Send an angle and a price on requests that fit, or accept offers sent from your profile.",
  },
  {
    title: "Deliver and get paid",
    body: "Answer the client's notes, and get paid the moment they approve.",
  },
];

function HowItWorksForCreators() {
  return (
    <section aria-labelledby="creator-steps-title">
      <SectionHeader
        id="creator-steps-title"
        title={
          <>
            How it works <span className="y-strong">for creators</span>
          </>
        }
      />
      <Block tone="paper" pad="lg">
        <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
          {creatorSteps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-4">
              <StepNumber n={index + 1} className="text-[56px] md:text-[72px]" />
              <div className="flex flex-col gap-2">
                <h3 className="y-display y-title">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="y-body y-fg-2 max-w-[38ch]">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Block>
    </section>
  );
}

const payoutFlow = [
  { title: "Secured", body: "The client pays before you film." },
  { title: "Released", body: `When they approve, or ${AUTO_APPROVE_DAYS} days after you deliver.` },
  { title: "Withdrawn", body: `From ${money(MARKETING.minimumPayout)}, to a bank or a wallet.` },
  { title: "In your account", body: `Usually within ${MARKETING.payoutTime}.` },
];

function Payouts() {
  return (
    <section id="payouts" aria-labelledby="payouts-title" className="scroll-mt-24">
      <SectionHeader
        id="payouts-title"
        title={
          <>
            You keep <span className="y-strong">100% of your price</span>
          </>
        }
        sub={`Clients pay Yapp's ${FEE_PCT}% fee on top. Nothing is taken from what you quote.`}
      />
      <div className="flex flex-col gap-2">
        <Block tone="paper" pad="lg">
          <ol className="grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-8" aria-label="How a payment reaches you">
            {payoutFlow.map((stage, index) => (
              <li key={stage.title} className="flex flex-col gap-2">
                <span
                  aria-hidden
                  className="y-num grid size-8 place-items-center rounded-full bg-(--b-fg) text-[13px] font-semibold text-(--b-bg)"
                >
                  {index + 1}
                </span>
                <span className="y-head">{stage.title}</span>
                <span className="y-small y-fg-2">{stage.body}</span>
              </li>
            ))}
          </ol>
        </Block>
        <EarningsEstimator />
      </div>
    </section>
  );
}

function OpenRequests() {
  const s = useDemo();
  const open = s.requests
    .filter((r) => r.status === "open" && r.visibility === "public")
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt))
    .slice(0, 3);
  if (!open.length) return null;
  return (
    <section id="requests" aria-labelledby="requests-title" className="scroll-mt-24">
      <SectionHeader
        id="requests-title"
        title={
          <>
            Open requests <span className="y-strong">right now</span>
          </>
        }
        sub="Real briefs from app teams, with the budget stated before you pitch."
        action={
          <PillButton href="/creator/opportunities" variant="contrast" arrow>
            See all opportunities
          </PillButton>
        }
      />
      <ul className="grid gap-2 lg:grid-cols-3">
        {open.map((request) => (
          <li key={request.id} className="flex">
            <RequestCard
              request={request}
              perspective="creator"
              href={`/creator/opportunities/${request.id}`}
              className="w-full"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function FinalCta() {
  return (
    <section aria-labelledby="creator-cta-title" className="mt-16 md:mt-24">
      <Block tone="lavender" pad="none" className="grid overflow-hidden lg:grid-cols-12">
        <div className="flex flex-col gap-8 p-6 md:p-10 lg:col-span-7">
          <h2 id="creator-cta-title" className="y-display y-t-display max-w-[16ch]">
            Your next client is <span className="y-strong">looking for your voice</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            <PillButton href="/signup?role=creator" variant="neon" size="lg" arrow>
              Create your creator profile
            </PillButton>
            <PillButton href="/how-it-works" variant="outline" size="lg">
              How Yapp works
            </PillButton>
          </div>
        </div>
        <div className="flex items-end justify-center px-6 pt-2 lg:col-span-5 lg:px-10">
          <Cast members={duoCast} viewBox="-8 -8 154 148" className="block h-auto w-full max-w-[260px]" />
        </div>
      </Block>
    </section>
  );
}
