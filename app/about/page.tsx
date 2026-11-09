"use client";

import {
  ChevronLeft,
  ChevronRight,
  Languages,
  Mic,
  Repeat2,
  ShieldCheck,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { CreatorCard } from "@/components/domain/creator-card";
import { VideoThumb } from "@/components/domain/video-thumb";
import {
  FloatWidget,
  IconTile,
  MarketingMain,
  SectionHeader,
  StepNumber,
} from "@/components/marketing/blocks";
import { campaignFacts, featuredCreators, platformStats } from "@/components/marketing/platform";
import { PublicShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { Cast, heroCast } from "@/components/ui/character";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { money, moneyRange, num } from "@/lib/format";
import { paths } from "@/lib/paths";
import { businessById, creatorById, featuredVideo, isCampaign, me } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { formatById, formats } from "@/lib/taxonomy";
import type { Creator, Video } from "@/lib/types";

/** The creator whose featured video fronts the hero. */
const HERO_CREATOR = "cr-layla";

export default function LandingPage() {
  const s = useDemo();
  const heroCreator = creatorById(s, HERO_CREATOR) ?? featuredCreators(s, 1)[0];
  const heroVideo = heroCreator ? featuredVideo(s, heroCreator) : undefined;

  return (
    <PublicShell>
      <MarketingMain>
        <Hero creator={heroCreator} video={heroVideo} />
        <Stats />
        <Formats />
        <HowItWorks />
        <FeaturedCreators />
        <WhyYapp />
        <CreatorLane />
        <FinalCta />
      </MarketingMain>
    </PublicShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */

function Hero({ creator, video }: { creator?: Creator; video?: Video }) {
  return (
    <section aria-labelledby="hero-title" className="grid gap-2 lg:grid-cols-12">
      <Block
        tone="paper"
        pad="lg"
        className="flex flex-col justify-between gap-10 lg:col-span-7 lg:min-h-[560px]"
      >
        <div className="flex flex-col gap-6 md:gap-8">
          <h1
            id="hero-title"
            className="y-display y-hero max-sm:!text-[2.75rem] lg:!text-[4.25rem] xl:!text-[5.25rem]"
          >
            Get your app <span className="y-strong whitespace-nowrap">talked about</span>
          </h1>
          <p className="y-lead y-fg-2 max-w-[50ch]">
            Order demos and honest reviews of your app from creators, at a fixed price. Payment is
            held until you&apos;ve approved the video.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <PillButton href={paths.creators} variant="neon" size="lg" arrow>
              Find a creator
            </PillButton>
            <PillButton href={paths.newOrder()} variant="outline" size="lg">
              Place an order
            </PillButton>
          </div>
          <p className="y-small y-fg-2 flex items-start gap-2">
            <Languages size={16} aria-hidden className="mt-0.5 flex-none" />
            In Saudi, Khaleeji, Egyptian and Levantine Arabic, and English.
          </p>
        </div>
      </Block>

      <HeroVisual creator={creator} video={video} />
    </section>
  );
}

function HeroVisual({ creator, video }: { creator?: Creator; video?: Video }) {
  return (
    <Block
      tone="lavender"
      pad="none"
      className="relative isolate flex min-h-[520px] items-center justify-center overflow-hidden px-6 py-16 lg:col-span-5 lg:min-h-0"
    >
      {creator && video ? (
        <>
          <Link
            href={paths.creator(creator.handle)}
            aria-label={`Watch “${video.title}” on ${creator.firstName}'s profile`}
            className="group relative block w-[min(64%,272px)] -rotate-2 rounded-(--y-r-tile) transition-transform duration-(--y-dur-2) hover:rotate-0"
          >
            <VideoThumb
              video={video}
              playable
              decorative
              className="shadow-[0_28px_56px_-24px_rgb(14_14_16/0.55)]"
            />
          </Link>
          <FloatWidget
            tone="paper"
            className="absolute end-4 bottom-6 md:end-6 md:bottom-8"
            icon={<FaceAvatar id={creator.id} name="" size={44} />}
            title={
              <span className="inline-flex items-center gap-1">
                <Star size={14} aria-hidden className="fill-current" />
                <span className="y-num">{creator.rating.toFixed(1)}</span> ·{" "}
                {num(creator.reviewCount)} reviews
              </span>
            }
            sub={`${creator.name} · ${formatById[video.format].name}`}
          />
        </>
      ) : (
        <Cast members={heroCast} viewBox="-8 0 456 240" className="w-full" />
      )}
    </Block>
  );
}

/** One quiet block of four numbers. */
function Stats() {
  const s = useDemo();
  const stats = platformStats(s);
  const items: { value: React.ReactNode; label: string }[] = [
    { value: num(stats.completed), label: "videos delivered and paid" },
    {
      value: (
        <>
          {stats.firstDeliveryDays}
          <span className="text-[0.5em] tracking-[-0.02em]"> days</span>
        </>
      ),
      label: "median time to a first version",
    },
    {
      value: (
        <>
          {stats.firstTimeApprovalPct}
          <span className="text-[0.5em]">%</span>
        </>
      ),
      label: "approved without a revision",
    },
    { value: stats.dialects, label: "Arabic dialects, plus English" },
  ];
  return (
    <Block tone="paper" pad="md" as="section" aria-label="Yapp in numbers">
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
        {items.map((item) => (
          <li key={item.label} className="flex flex-col gap-2 md:px-2">
            <span className="y-display y-num text-[40px] leading-none font-semibold tracking-[-0.04em] md:text-[52px]">
              {item.value}
            </span>
            <span className="y-small y-fg-2">{item.label}</span>
          </li>
        ))}
      </ul>
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* Formats                                                                     */
/* -------------------------------------------------------------------------- */

function Formats() {
  return (
    <section aria-labelledby="formats-title">
      <SectionHeader
        id="formats-title"
        title={
          <>
            Six formats that <span className="y-strong">sell software</span>
          </>
        }
      />
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {formats.map((format) => {
          const Icon = format.icon;
          return (
            <li key={format.id}>
              <Block
                tone="paper"
                pad="md"
                className="y-hoverable relative flex h-full items-center gap-4"
              >
                <IconTile>
                  <Icon size={20} />
                </IconTile>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h3 className="y-head">
                    <Link
                      href={`${paths.creators}?format=${format.id}`}
                      className="after:absolute after:inset-0 after:z-[2] after:rounded-(--y-r-block) after:content-['']"
                    >
                      {format.name}
                    </Link>
                  </h3>
                  <p className="y-small y-fg-2">{format.short}</p>
                </div>
              </Block>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* How it works                                                                */
/* -------------------------------------------------------------------------- */

const steps = [
  {
    title: "Describe what you need",
    body: "Pick a format, a dialect and a budget. Your product details fill in the rest.",
  },
  {
    title: "Pick a creator",
    body: "Compare pitches with an angle, a fixed price and samples, or order straight from a profile.",
  },
  {
    title: "Approve, then we pay them",
    body: "Leave notes on the video, use your included revisions, and approve when it's right.",
  },
];

function HowItWorks() {
  const campaign = campaignFacts();
  return (
    <section aria-labelledby="how-title">
      <SectionHeader
        id="how-title"
        title={
          <>
            Three steps, <span className="y-strong">no production skills</span>
          </>
        }
        action={
          <PillButton href={paths.howItWorks} variant="outline" arrow>
            The full process
          </PillButton>
        }
      />
      <Block tone="paper" pad="lg" className="flex flex-col gap-10">
        <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
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
        <div className="flex flex-col gap-4 border-t border-(--b-line) pt-6 md:flex-row md:items-center md:justify-between">
          <p className="y-body max-w-[72ch]">
            <span className="font-semibold">
              Need {campaign.minVideos} or more videos? Run a UGC campaign.
            </span>{" "}
            <span className="y-fg-2">
              A fixed price per video set by follower tier, from {money(campaign.fromPrice)}. Creators take
              slots first come, first served, and every video comes from a different creator. No
              service fee.
            </span>
          </p>
          <Link
            href={`${paths.howItWorks}#campaigns`}
            className="y-link y-small flex-none font-semibold"
          >
            How campaigns work
          </Link>
        </div>
      </Block>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Featured creators                                                           */
/* -------------------------------------------------------------------------- */

function FeaturedCreators() {
  const s = useDemo();
  const list = featuredCreators(s, 8);
  const scroller = useRef<HTMLUListElement>(null);
  const scroll = (direction: 1 | -1) => {
    const element = scroller.current;
    if (!element) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollBy({
      left: direction * element.clientWidth * 0.8,
      behavior: reduce ? "auto" : "smooth",
    });
  };
  return (
    <section aria-labelledby="creators-title">
      <SectionHeader
        id="creators-title"
        title={
          <>
            Creators your customers <span className="y-strong">already trust</span>
          </>
        }
        sub="For custom orders, choose on portfolio, reviews and on-time record, not follower count."
        action={
          <>
            <RoundIconButton
              label="Scroll creators back"
              tone="outline"
              onClick={() => scroll(-1)}
              className="hidden md:inline-grid"
            >
              <ChevronLeft size={20} aria-hidden className="y-flip" />
            </RoundIconButton>
            <RoundIconButton
              label="Scroll creators forward"
              tone="outline"
              onClick={() => scroll(1)}
              className="hidden md:inline-grid"
            >
              <ChevronRight size={20} aria-hidden className="y-flip" />
            </RoundIconButton>
            <PillButton href={paths.creators} variant="contrast" arrow>
              Browse all creators
            </PillButton>
          </>
        }
      />
      <ul
        ref={scroller}
        className="y-scroll-x -mx-(--y-gutter) flex scroll-px-(--y-gutter) gap-2 px-(--y-gutter)"
      >
        {list.map((creator) => (
          <li key={creator.id} className="flex w-[78vw] max-w-[310px] flex-none snap-start sm:w-[300px]">
            <CreatorCard creator={creator} className="w-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Why Yapp: dialects, protection, repeat business                             */
/* -------------------------------------------------------------------------- */

const reasons = [
  {
    icon: <ShieldCheck size={22} />,
    title: "Paid only when you approve",
    body: "Payment is held while they work, with a full refund if the video isn't delivered. Our fee is charged only when work completes.",
  },
  {
    icon: <Languages size={22} />,
    title: "Your customers' dialect",
    body: "Creators who sound like your audience, from Riyadh to Cairo to Casablanca.",
  },
  {
    icon: <Repeat2 size={22} />,
    title: "Easier every time",
    body: "Feedback is saved to your product, so the next brief starts from what worked.",
  },
];

function WhyYapp() {
  return (
    <section aria-labelledby="why-title">
      <SectionHeader
        id="why-title"
        title={
          <>
            Why teams <span className="y-strong">choose Yapp</span>
          </>
        }
        action={
          <PillButton href={`${paths.howItWorks}#protection`} variant="outline" arrow>
            How protection works
          </PillButton>
        }
      />
      <Block tone="paper" pad="lg">
        <ul className="grid gap-10 md:grid-cols-3 md:gap-8">
          {reasons.map((reason) => (
            <li key={reason.title} className="flex flex-col gap-4">
              <IconTile>{reason.icon}</IconTile>
              <div className="flex flex-col gap-2">
                <h3 className="y-display y-title">{reason.title}</h3>
                <p className="y-body y-fg-2 max-w-[38ch]">{reason.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Block>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Creator lane                                                                */
/* -------------------------------------------------------------------------- */

function CreatorLane() {
  const s = useDemo();
  const myBusinessId = me.ids(s).businessId;
  const facts = campaignFacts();
  const open = s.requests
    .filter((r) => r.status === "open" && r.visibility === "public" && r.businessId !== myBusinessId)
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt))
    .slice(0, 3);

  return (
    <section aria-labelledby="creators-lane-title" className="mt-16 md:mt-24">
      <Block tone="night" pad="lg" className="grid grid-cols-1 gap-10 overflow-hidden lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-6">
          <span className="y-chip w-fit">
            <Mic size={14} aria-hidden />
            One account to order videos and to make them
          </span>
          <h2 id="creators-lane-title" className="y-display y-t-display">
            Make videos for apps, <span className="y-strong">get paid reliably</span>
          </h2>
          <p className="y-lead y-fg-2 max-w-[46ch]">
            Keep 100% of your price on custom orders, with payment secured before you film. Have{" "}
            {facts.floor}+ followers? Take UGC campaign slots at a fixed price per video.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <PillButton href={paths.forCreators} variant="neon" size="lg" arrow>
              Start making videos
            </PillButton>
          </div>
        </div>
        {open.length ? (
          <div className="flex min-w-0 flex-col gap-2 lg:col-span-6 lg:justify-center">
            <p className="y-micro y-fg-2 px-1">Open orders right now</p>
            <ul className="flex flex-col gap-2">
              {open.map((request) => {
                const business = businessById(s, request.businessId);
                return (
                  <li
                    key={request.id}
                    className="y-tile flex items-center gap-3 !rounded-[22px] p-3 pe-4 md:pe-5"
                  >
                    {business ? <BusinessLogo business={business} size={40} /> : null}
                    <div className="min-w-0 flex-1">
                      <p className="y-small truncate font-semibold">{request.title}</p>
                      <p className="y-micro y-fg-2 truncate">
                        {business?.name} · {formatById[request.brief.format].name}
                      </p>
                    </div>
                    <span className="y-num y-small flex-none font-semibold">
                      {isCampaign(request) && request.campaign
                        ? `${money(request.campaign.pricePerVideo)} per Yapp`
                        : moneyRange(request.budget.min, request.budget.max)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </Block>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Final CTA                                                                   */
/* -------------------------------------------------------------------------- */

function FinalCta() {
  return (
    <Block tone="butter" pad="none" className="grid overflow-hidden lg:grid-cols-12">
      <div className="flex flex-col gap-8 p-6 md:p-10 lg:col-span-7">
        <div className="flex flex-col gap-3">
          <h2 className="y-display y-t-display max-w-[15ch]">
            Your next video is <span className="y-strong">one brief away</span>
          </h2>
          <p className="y-body y-fg-2 max-w-[44ch]">One account to order videos and to make them.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PillButton href={paths.signUp} variant="contrast" size="lg" arrow>
            Get started
          </PillButton>
          <PillButton href={paths.howItWorks} variant="outline" size="lg">
            See how it works
          </PillButton>
        </div>
      </div>
      <div className="flex items-end justify-center px-6 pt-4 lg:col-span-5 lg:px-10">
        <Cast
          members={heroCast}
          viewBox="-8 0 456 240"
          className="block h-auto w-full max-w-[460px]"
        />
      </div>
    </Block>
  );
}
