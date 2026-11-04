"use client";

import {
  Banknote,
  BriefcaseBusiness,
  Clock,
  Gift,
  Landmark,
  Mic,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { BusinessLogo } from "@/components/domain/business-logo";
import { FormatChip } from "@/components/domain/chips";
import { RequestCard } from "@/components/domain/request-card";
import { VideoThumb } from "@/components/domain/video-thumb";
import {
  CheckList,
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
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { Cast, duoCast } from "@/components/ui/character";
import { AvatarStack, FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { money, plural, priceBreakdown } from "@/lib/format";
import { businessById, cityById, creatorById, featuredVideo, startingPrice } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import {
  AUTO_APPROVE_DAYS,
  creatorKinds,
  formatById,
  SERVICE_FEE_RATE,
} from "@/lib/taxonomy";
import type { CreatorKind, FormatId } from "@/lib/types";

/** Creator whose work fronts the hero (an everyday presenter, to make the point). */
const HERO_CREATOR = "cr-hana";
/** Business shown sending the example direct offer. */
const OFFER_BUSINESS = "b-qalamy";
const FEE_PCT = Math.round(SERVICE_FEE_RATE * 100);

const kindExamples: Record<CreatorKind, { formats: FormatId[]; note: string }> = {
  presenter: {
    formats: ["selfie-demo", "ugc-review", "problem-skit"],
    note: "A phone, good light and a natural way of talking are enough to start.",
  },
  producer: {
    formats: ["screen-walkthrough", "tutorial", "hook-pack"],
    note: "Scripting, voiceover, motion or a full crew. Polished work commands higher prices.",
  },
  influencer: {
    formats: ["ugc-review", "selfie-demo", "hook-pack"],
    note: "Everything above, plus posting to your own audience as a paid add-on.",
  },
};

const creatorQuotes: { creatorId: string; quote: string }[] = [
  {
    creatorId: "cr-hana",
    quote:
      "I used to chase brands for weeks to get paid. On Yapp the money is secured before I film, and it lands the day they approve. That alone changed how I plan my month.",
  },
  {
    creatorId: "cr-omar",
    quote:
      "The briefs are the best part. Product, audience, what to avoid, even what worked last time. I spend my time making the video instead of guessing what the client wants.",
  },
  {
    creatorId: "cr-noura",
    quote:
      "I don't have a big following and I'm booked most weeks. Clients find me through my portfolio, and three of them have come back for their next campaign.",
  },
];

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
        <WhoItsFor />
        <HowItWorksForCreators />
        <Payouts />
        <OpenRequests />
        <Voices />
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
  const offerFrom = businessById(s, OFFER_BUSINESS);
  const standard = creator?.packages.find((p) => p.tier === "standard") ?? creator?.packages[0];
  const basic = creator?.packages.find((p) => p.tier === "basic") ?? creator?.packages[0];

  return (
    <section aria-labelledby="hero-title" className="grid gap-2 lg:grid-cols-12">
      <Block
        tone="paper"
        pad="lg"
        className="flex flex-col justify-between gap-10 lg:col-span-7 lg:min-h-[580px]"
      >
        <div className="flex flex-col gap-6 md:gap-8">
          <p className="y-chip w-fit">
            <Mic size={14} aria-hidden />
            For creators, presenters and video producers
          </p>
          <h1
            id="hero-title"
            className="y-display y-hero max-sm:!text-[2.6rem] lg:!text-[4rem] xl:!text-[4.75rem]"
          >
            Get paid to <span className="y-strong">talk about apps</span> you&apos;d actually use
          </h1>
          <p className="y-lead y-fg-2 max-w-[54ch]">
            App teams across the Arab world need people who can explain their product naturally,
            in the dialect their customers speak. Pitch on clear briefs or take direct offers, and
            get paid reliably for every video you deliver.
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
            <ShieldCheck size={16} aria-hidden className="mt-0.5 flex-none" />
            Free to join. Payment is secured before you start, and you keep 100% of your price.
          </p>
        </div>
      </Block>

      <Block
        tone="butter"
        pad="none"
        className="relative isolate flex min-h-[540px] items-center justify-center overflow-hidden px-6 py-16 lg:col-span-5 lg:min-h-0"
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
        {offerFrom && standard ? (
          <FloatWidget
            tone="night"
            className="absolute start-4 top-5 md:start-7 md:top-7"
            icon={<BusinessLogo business={offerFrom} size={44} />}
            title={`Direct offer from ${offerFrom.name}`}
            sub={`${money(standard.price)} · ${plural(standard.deliveryDays, "day")} · Payment secured`}
          />
        ) : null}
        {creator && basic ? (
          <FloatWidget
            tone="paper"
            className="absolute end-4 bottom-5 md:end-7 md:bottom-7"
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

function WhoItsFor() {
  const s = useDemo();
  return (
    <section aria-labelledby="who-title">
      <SectionHeader
        id="who-title"
        title={
          <>
            Your portfolio matters, <span className="y-strong">not your follower count</span>
          </>
        }
        sub="Businesses hire on Yapp to get videos for their own accounts and ads. They choose by the work you've made and how reliably you deliver it."
      />
      <ul className="grid gap-2 lg:grid-cols-3">
        {creatorKinds.map((kind) => {
          const Icon = kind.icon;
          const people = s.creators.filter((c) => c.kind === kind.id);
          const from = people.length ? Math.min(...people.map((c) => startingPrice(c))) : 0;
          const examples = kindExamples[kind.id];
          return (
            <li key={kind.id}>
              <Block tone="paper" pad="md" className="flex h-full flex-col gap-6">
                <div className="flex items-start justify-between gap-3">
                  <IconTile>
                    <Icon size={22} />
                  </IconTile>
                  {people.length ? (
                    <span className="y-micro y-fg-2 flex items-center gap-2">
                      <AvatarStack
                        size={28}
                        max={4}
                        people={people.map((c) => ({ id: c.id, name: "" }))}
                      />
                      {plural(people.length, "creator")}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="y-display y-title">{kind.name}</h3>
                  <p className="y-body y-fg-2">{kind.description}</p>
                  <p className="y-small y-fg-2">{examples.note}</p>
                </div>
                <div className="mt-auto flex flex-col gap-3 border-t border-(--b-line) pt-4">
                  <div className="flex flex-wrap gap-1.5">
                    {examples.formats.map((id) => (
                      <FormatChip key={id} id={id} />
                    ))}
                  </div>
                  {from ? (
                    <p className="y-micro y-fg-2">
                      Prices on Yapp start from{" "}
                      <span className="y-num font-semibold text-(--b-fg)">{money(from)}</span> a
                      video
                    </p>
                  ) : null}
                </div>
              </Block>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function HowItWorksForCreators() {
  const s = useDemo();
  const layla = creatorById(s, "cr-layla");
  const offerFrom = businessById(s, OFFER_BUSINESS);
  const standard = layla?.packages.find((p) => p.tier === "standard");

  const steps = [
    {
      tone: "paper" as const,
      icon: UserRound,
      title: "Build a profile that shows your work",
      body: "Add your best videos, the dialects you speak naturally, the formats you're good at, and packages with your own prices and turnaround.",
      snippet: layla ? (
        <div data-tone="mist" className="y-block flex items-center gap-3 !rounded-[20px] p-3">
          <FaceAvatar id={layla.id} name="" size={40} />
          <span className="min-w-0 flex-1">
            <span className="y-small block truncate font-semibold">{layla.name}</span>
            <span className="y-micro y-fg-2 block truncate">
              {formatById[layla.formats[0]].name} · from {money(startingPrice(layla))}
            </span>
          </span>
          <Badge tone="neutral" icon={<Sparkles size={14} aria-hidden />}>
            {plural(layla.portfolioIds.length, "video")}
          </Badge>
        </div>
      ) : null,
    },
    {
      tone: "sky" as const,
      icon: Send,
      title: "Pitch on requests, or accept direct offers",
      body: "Send an angle, a price and a turnaround on requests that fit you, or accept offers businesses send from your profile. The payment is secured before you start.",
      snippet:
        offerFrom && standard ? (
          <div data-tone="paper" className="y-block flex items-center gap-3 !rounded-[20px] p-3">
            <BusinessLogo business={offerFrom} size={40} />
            <span className="min-w-0 flex-1">
              <span className="y-small block truncate font-semibold">Offer from {offerFrom.name}</span>
              <span className="y-micro y-fg-2 block truncate">
                {money(standard.price)} · due in {plural(standard.deliveryDays, "day")}
              </span>
            </span>
            <Badge tone="success" icon={<ShieldCheck size={14} aria-hidden />}>
              Secured
            </Badge>
          </div>
        ) : null,
    },
    {
      tone: "paper" as const,
      icon: Banknote,
      title: "Deliver, and get paid when it's approved",
      body: `Upload your video, answer timestamped notes, and get paid the moment the client approves. If they don't respond, it approves itself after ${AUTO_APPROVE_DAYS} days.`,
      snippet: standard ? (
        <div data-tone="mist" className="y-block flex items-center gap-3 !rounded-[20px] p-3">
          <IconTile size="sm">
            <Landmark size={18} />
          </IconTile>
          <span className="min-w-0 flex-1">
            <span className="y-small block truncate font-semibold">
              {money(standard.price)} released
            </span>
            <span className="y-micro y-fg-2 block truncate">To your bank in {MARKETING.payoutTime}</span>
          </span>
        </div>
      ) : null,
    },
  ];

  return (
    <section aria-labelledby="creator-steps-title">
      <SectionHeader
        id="creator-steps-title"
        title={
          <>
            How it works <span className="y-strong">for creators</span>
          </>
        }
        sub="Clear expectations up front, a protected payment before you start, and nothing to chase afterwards."
      />
      <ol className="grid gap-2 lg:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title}>
              <Block tone={step.tone} pad="md" className="flex h-full flex-col gap-6">
                <div className="flex items-start justify-between gap-3">
                  <StepNumber n={index + 1} className="text-[64px] md:text-[80px]" />
                  <IconTile>
                    <Icon size={20} />
                  </IconTile>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="y-display y-title">
                    <span className="sr-only">Step {index + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="y-body y-fg-2">{step.body}</p>
                </div>
                <div className="mt-auto">{step.snippet}</div>
              </Block>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Payouts() {
  const example = priceBreakdown(260);
  return (
    <section id="payouts" aria-labelledby="payouts-title" className="scroll-mt-24">
      <SectionHeader
        id="payouts-title"
        title={
          <>
            You keep <span className="y-strong">100% of your price</span>
          </>
        }
        sub={`Yapp is paid by the business, with a ${FEE_PCT}% service fee on top of your price. Nothing is taken from what you quote.`}
      />
      <div className="flex flex-col gap-2">
        <Block tone="night" pad="lg" className="grid gap-10 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-6">
            <h3 className="y-display y-title">How a payment reaches you</h3>
            <CheckList
              items={[
                "The client's payment is secured when the commission starts, before you film",
                `Released to your Yapp balance when they approve, or automatically ${AUTO_APPROVE_DAYS} days after delivery`,
                `Withdraw from ${money(MARKETING.minimumPayout)} to a bank account (IBAN) or a wallet`,
                `Bank transfers usually arrive in ${MARKETING.payoutTime}`,
                "Every payment comes with a receipt for your records",
              ]}
            />
          </div>
          <div className="flex flex-col gap-2 lg:col-span-6" aria-label="Example: a $260 video">
            <p className="y-micro y-fg-2 px-1">Example: a video you price at {money(example.price)}</p>
            <div data-tone="paper" className="y-block flex items-center justify-between gap-4 !rounded-[22px] p-4 md:p-5">
              <span className="flex items-center gap-3">
                <IconTile>
                  <Wallet size={20} />
                </IconTile>
                <span>
                  <span className="y-small block font-semibold">You receive</span>
                  <span className="y-micro y-fg-2">100% of your price</span>
                </span>
              </span>
              <span className="y-display y-num text-[36px] leading-none font-semibold tracking-[-0.03em]">
                {money(example.creatorEarns)}
              </span>
            </div>
            <div className="y-block flex items-center justify-between gap-4 !rounded-[22px] bg-white/[0.06] p-4 md:p-5" data-tone="night">
              <span className="flex items-center gap-3">
                <IconTile>
                  <BriefcaseBusiness size={20} />
                </IconTile>
                <span>
                  <span className="y-small block font-semibold">The client pays</span>
                  <span className="y-micro y-fg-2">
                    Your price + {FEE_PCT}% service fee ({money(example.fee)})
                  </span>
                </span>
              </span>
              <span className="y-display y-num text-[28px] leading-none font-semibold tracking-[-0.03em]">
                {money(example.total)}
              </span>
            </div>
            <div className="y-block flex items-center gap-3 !rounded-[22px] bg-white/[0.06] p-4 md:p-5" data-tone="night">
              <IconTile>
                <Clock size={20} />
              </IconTile>
              <span className="y-small y-fg-2">
                Payments are never held back for slow clients: no response for {AUTO_APPROVE_DAYS}{" "}
                days means approved.
              </span>
            </div>
          </div>
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
        sub="Real briefs from app teams: the product, the audience, the dialect and the budget, all stated before you pitch."
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

function Voices() {
  const s = useDemo();
  const tones = ["paper", "sky", "paper"] as const;
  const quotes = creatorQuotes
    .map((item) => ({ ...item, creator: creatorById(s, item.creatorId) }))
    .filter((item) => item.creator);
  if (!quotes.length) return null;
  return (
    <section aria-labelledby="voices-title">
      <SectionHeader
        id="voices-title"
        title={
          <>
            From creators <span className="y-strong">already on Yapp</span>
          </>
        }
      />
      <ul className="grid gap-2 lg:grid-cols-3">
        {quotes.map(({ creator, quote }, index) => {
          if (!creator) return null;
          const city = cityById(creator.cityId);
          const kind = creatorKinds.find((k) => k.id === creator.kind);
          return (
            <li key={creator.id}>
              <Block
                as="figure"
                tone={tones[index % tones.length]}
                pad="md"
                className="flex h-full flex-col justify-between gap-8"
              >
                <blockquote className="y-display text-[21px] leading-snug md:text-[23px]">
                  <p>“{quote}”</p>
                </blockquote>
                <figcaption className="flex items-center gap-3">
                  <FaceAvatar id={creator.id} name="" size={48} />
                  <span className="flex min-w-0 flex-col">
                    <span className="y-small font-semibold">{creator.name}</span>
                    <span className="y-micro y-fg-2">
                      {kind?.name} · {city?.name} · {plural(creator.completed, "commission")}
                    </span>
                  </span>
                </figcaption>
              </Block>
            </li>
          );
        })}
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
            <PillButton href="/how-it-works#creators" variant="outline" size="lg">
              How Yapp works
            </PillButton>
          </div>
          <p className="y-small y-fg-2 flex items-start gap-2">
            <Gift size={16} aria-hidden className="mt-0.5 flex-none" />
            Free to join. Most creators set up their profile in about ten minutes.
          </p>
        </div>
        <div className="flex items-end justify-center px-6 pt-2 lg:col-span-5 lg:px-10">
          <Cast members={duoCast} viewBox="-8 -8 154 148" className="block h-auto w-full max-w-[260px]" />
        </div>
      </Block>
    </section>
  );
}
