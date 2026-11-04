"use client";

import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Languages,
  Mic,
  Repeat2,
  ShieldCheck,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { languageList } from "@/components/domain/chips";
import { CreatorCard } from "@/components/domain/creator-card";
import { StarRow } from "@/components/domain/stars";
import { VideoThumb } from "@/components/domain/video-thumb";
import {
  CheckList,
  FloatWidget,
  IconTile,
  MarketingMain,
  QuickLink,
  SectionHeader,
  StepNumber,
} from "@/components/marketing/blocks";
import {
  examplesByFormat,
  examplesByLanguage,
  featuredCreators,
  pickReviews,
  platformStats,
  typicalLength,
} from "@/components/marketing/platform";
import {
  MiniBrief,
  MiniLearnings,
  MiniPitches,
  MiniReview,
} from "@/components/marketing/snippets";
import { PublicShell } from "@/components/shell/app-shell";
import { Block, type BlockTone } from "@/components/ui/block";
import { Cast, heroCast } from "@/components/ui/character";
import { Crowd } from "@/components/ui/crowd";
import { AvatarStack, FaceAvatar } from "@/components/ui/face-avatar";
import { Ar } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { moneyRange, num } from "@/lib/format";
import {
  businessById,
  creatorById,
  featuredVideo,
  pitchesForRequest,
} from "@/lib/selectors";
import { ME, useDemo } from "@/lib/store";
import { AUTO_APPROVE_DAYS, formatById, formats, languageById, languages } from "@/lib/taxonomy";
import type { Creator, FormatId, LanguageId, Video } from "@/lib/types";

/** The creator whose featured video fronts the hero. */
const HERO_CREATOR = "cr-layla";
/** Faces set inline in the headline. */
const HEADLINE_FACES = ["cr-noura", "cr-hana", "cr-omar"];
const QUICK_DIALECTS: LanguageId[] = [
  "ar-saudi",
  "ar-gulf",
  "ar-egyptian",
  "ar-levantine",
  "ar-iraqi",
  "ar-maghrebi",
];
const SHOWCASE_DIALECTS: LanguageId[] = ["ar-saudi", "ar-gulf", "ar-egyptian", "ar-levantine"];
const FORMAT_IDS = formats.map((f) => f.id) as FormatId[];
/** Strong, specific reviews from different businesses (falls back to other five-star reviews). */
const TESTIMONIALS = ["rv-1", "rv-26", "rv-8"];

export default function LandingPage() {
  const s = useDemo();
  const heroCreator = creatorById(s, HERO_CREATOR) ?? featuredCreators(s, 1)[0];
  const heroVideo = heroCreator ? featuredVideo(s, heroCreator) : undefined;

  return (
    <PublicShell>
      <MarketingMain>
        <Hero creator={heroCreator} video={heroVideo} />
        <BrowseBar />
        <Stats />
        <Formats exclude={heroVideo ? [heroVideo.id] : []} />
        <HowItWorks />
        <FeaturedCreators />
        <Dialects exclude={heroVideo ? [heroVideo.id] : []} />
        <Dependable />
        <Testimonials />
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
  const s = useDemo();
  const faces = HEADLINE_FACES.map((id) => creatorById(s, id))
    .filter((c): c is Creator => Boolean(c))
    .map((c) => ({ id: c.id, name: "" }));

  return (
    <section aria-labelledby="hero-title" className="grid gap-2 lg:grid-cols-12">
      <Block
        tone="paper"
        pad="lg"
        className="flex flex-col justify-between gap-10 lg:col-span-7 lg:min-h-[580px]"
      >
        <div className="flex flex-col gap-6 md:gap-8">
          <p className="y-chip w-fit">
            <Languages size={14} aria-hidden />
            Social video for app teams, in Arabic and English
          </p>
          <h1
            id="hero-title"
            className="y-display y-hero max-sm:!text-[2.75rem] lg:!text-[4.25rem] xl:!text-[5.25rem]"
          >
            Get your app{" "}
            {faces.length ? (
              <AvatarStack
                people={faces}
                size={56}
                max={3}
                className="mx-1 -mt-2 align-middle md:-mt-4"
              />
            ) : null}{" "}
            <span className="y-strong whitespace-nowrap">talked about</span>
          </h1>
          <p className="y-lead y-fg-2 max-w-[54ch]">
            Commission creators who speak your customers&apos; dialect to film selfie demos,
            walkthroughs and honest reviews of your app. Clear deliverables, fixed prices, and
            your payment is held until you approve the video.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <PillButton href="/creators" variant="neon" size="lg" arrow>
              Find a creator
            </PillButton>
            <PillButton href="/business/requests/new" variant="outline" size="lg">
              Post a request
            </PillButton>
          </div>
          <p className="y-small y-fg-2 flex items-start gap-2">
            <ShieldCheck size={16} aria-hidden className="mt-0.5 flex-none" />
            No subscription. Pay per video, and only once you&apos;ve approved it.
          </p>
        </div>
      </Block>

      <HeroVisual creator={creator} video={video} />
    </section>
  );
}

function HeroVisual({ creator, video }: { creator?: Creator; video?: Video }) {
  const fastest = creator ? Math.min(...creator.packages.map((p) => p.deliveryDays)) : 4;
  return (
    <Block
      tone="lavender"
      pad="none"
      className="relative isolate flex min-h-[540px] items-center justify-center overflow-hidden px-6 py-16 lg:col-span-5 lg:min-h-0"
    >
      {creator && video ? (
        <Link
          href={`/creators/${creator.handle}`}
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
      ) : (
        <Cast members={heroCast} viewBox="-8 0 456 240" className="w-full" />
      )}

      {creator ? (
        <>
          <FloatWidget
            tone="night"
            className="absolute start-4 top-5 md:start-7 md:top-7"
            icon={
              <span
                aria-hidden
                className="y-display y-num grid size-11 flex-none place-items-center rounded-[14px] bg-(--y-night-fg) text-[22px] font-semibold text-[#0e0e10]"
              >
                {fastest}
              </span>
            }
            title={`Delivered in ${fastest} days`}
            sub="First version, before the due date"
          />
          <FloatWidget
            tone="paper"
            className="absolute end-4 top-[58%] md:end-6"
            icon={<FaceAvatar id={creator.id} name="" size={44} />}
            title={
              <span className="inline-flex items-center gap-1">
                <Star size={14} aria-hidden className="fill-current" />
                <span className="y-num">{creator.rating.toFixed(1)}</span> ·{" "}
                {num(creator.reviewCount)} reviews
              </span>
            }
            sub={`${creator.name} · ${video ? formatById[video.format].name : "Creator"}`}
          />
          <FloatWidget
            tone="sky"
            className="absolute start-4 bottom-5 md:start-7 md:bottom-7"
            icon={
              <IconTile>
                <ShieldCheck size={20} />
              </IconTile>
            }
            title="Payment protected"
            sub="Released only when you approve"
          />
        </>
      ) : null}
    </Block>
  );
}

function BrowseBar() {
  return (
    <Block tone="paper" pad="md" className="grid gap-6 lg:grid-cols-12 lg:items-start">
      <nav aria-labelledby="browse-format" className="flex min-w-0 flex-col gap-3 lg:col-span-7">
        <h2 id="browse-format" className="y-small font-semibold">
          Browse by format
        </h2>
        <div className="y-scroll-x -mx-5 -my-1.5 flex gap-2 px-5 py-1.5 md:mx-0 md:flex-wrap md:px-0">
          {formats.map((format) => {
            const Icon = format.icon;
            return (
              <QuickLink
                key={format.id}
                href={`/creators?format=${format.id}`}
                icon={<Icon size={16} aria-hidden />}
              >
                {format.name}
              </QuickLink>
            );
          })}
        </div>
      </nav>
      <nav
        aria-labelledby="browse-dialect"
        className="flex min-w-0 flex-col gap-3 lg:col-span-5 lg:border-s lg:border-(--b-line) lg:ps-6"
      >
        <h2 id="browse-dialect" className="y-small font-semibold">
          Browse by dialect
        </h2>
        <div className="y-scroll-x -mx-5 -my-1.5 flex gap-2 px-5 py-1.5 md:mx-0 md:flex-wrap md:px-0">
          {QUICK_DIALECTS.map((id) => {
            const lang = languageById[id];
            return (
              <QuickLink key={id} href={`/creators?lang=${id}`}>
                {lang.short}
                <Ar className="y-fg-2 font-medium">{lang.native}</Ar>
              </QuickLink>
            );
          })}
        </div>
      </nav>
    </Block>
  );
}

function Stats() {
  const s = useDemo();
  const stats = platformStats(s);
  const items: { tone: BlockTone; value: React.ReactNode; label: string }[] = [
    {
      tone: "night",
      value: num(stats.completed),
      label: "commissions completed and paid out",
    },
    {
      tone: "paper",
      value: (
        <>
          {stats.firstDeliveryDays}
          <span className="text-[0.5em] tracking-[-0.02em]"> days</span>
        </>
      ),
      label: "median time to the first version",
    },
    {
      tone: "butter",
      value: (
        <>
          {stats.firstTimeApprovalPct}
          <span className="text-[0.5em]">%</span>
        </>
      ),
      label: "of videos approved without a revision",
    },
    {
      tone: "paper",
      value: stats.dialects,
      label: "Arabic dialects covered, plus English",
    },
  ];
  return (
    <ul aria-label="Yapp in numbers" className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {items.map((item) => (
        <li key={item.label}>
          <Block tone={item.tone} pad="md" className="flex h-full flex-col justify-between gap-6">
            <span className="y-display y-num text-[44px] leading-none font-semibold tracking-[-0.04em] md:text-[60px]">
              {item.value}
            </span>
            <span className="y-small y-fg-2 max-w-[22ch]">{item.label}</span>
          </Block>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Formats                                                                     */
/* -------------------------------------------------------------------------- */

function Formats({ exclude }: { exclude: string[] }) {
  const s = useDemo();
  const examples = examplesByFormat(s, FORMAT_IDS, exclude);
  return (
    <section aria-labelledby="formats-title">
      <SectionHeader
        id="formats-title"
        title={
          <>
            Formats that <span className="y-strong">sell software</span>
          </>
        }
        sub="Six formats tuned for apps. Each has a clear structure, so you know exactly what you're getting before anyone presses record."
      />
      <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {formats.map((format) => {
          const video = examples[format.id];
          const creator = video ? creatorById(s, video.creatorId) : undefined;
          const Icon = format.icon;
          return (
            <li key={format.id}>
              <article
                data-tone="paper"
                className="y-block y-hoverable relative flex h-full gap-4 p-2.5 pe-5"
              >
                <div className="w-[38%] max-w-[180px] flex-none">
                  {video ? (
                    <VideoThumb video={video} frame="9:16" decorative showMeta={false} />
                  ) : (
                    <div className="aspect-[9/16] rounded-(--y-r-tile) bg-(--y-mist)" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <IconTile size="sm">
                      <Icon size={18} />
                    </IconTile>
                    <span className="y-micro y-fg-2 inline-flex items-center gap-1">
                      <Clock size={13} aria-hidden />
                      <span className="y-num">{typicalLength(format.typical)}</span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="y-head">
                      <Link
                        href={`/creators?format=${format.id}`}
                        className="after:absolute after:inset-0 after:z-[2] after:rounded-(--y-r-block) after:content-['']"
                      >
                        {format.name}
                      </Link>
                    </h3>
                    <p className="y-small y-fg-2">{format.short}</p>
                  </div>
                  <ol className="mt-auto flex flex-col gap-1.5" aria-label={`${format.name} structure`}>
                    {format.beats.map((beat, index) => (
                      <li key={beat} className="y-micro flex items-center gap-2">
                        <span
                          aria-hidden
                          className="y-num grid size-5 flex-none place-items-center rounded-full bg-(--b-chip) text-[10px] font-semibold"
                        >
                          {index + 1}
                        </span>
                        {beat}
                      </li>
                    ))}
                  </ol>
                  {video && creator ? (
                    <p className="y-micro y-fg-3">
                      Example by {creator.firstName} · {languageById[video.lang].short}
                    </p>
                  ) : null}
                </div>
              </article>
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

const steps: {
  tone: BlockTone;
  tag: string;
  title: string;
  body: string;
  snippet: React.ReactNode;
}[] = [
  {
    tone: "lavender",
    tag: "Brief",
    title: "Describe what you need",
    body: "Pick a format, a dialect and your platforms. Add your product once: who it's for, the tone, the dos and don'ts. Set a budget and a date, and you have a brief creators can quote on.",
    snippet: <MiniBrief />,
  },
  {
    tone: "butter",
    tag: "Hire",
    title: "Pick from creators who pitch",
    body: "Creators who fit send their angle, a fixed price and a turnaround, with samples of similar work. Compare them side by side, or skip the wait and commission someone straight from their profile.",
    snippet: <MiniPitches />,
  },
  {
    tone: "sky",
    tag: "Approve",
    title: "Approve the video, then we release payment",
    body: "Leave notes at exact moments in the video, use the revisions included in the package, and approve when it's right. Only then is the creator paid. If they don't deliver, you get a full refund.",
    snippet: <MiniReview />,
  },
];

function HowItWorks() {
  return (
    <section aria-labelledby="how-title">
      <SectionHeader
        id="how-title"
        title={
          <>
            Three steps, <span className="y-strong">no production skills</span>
          </>
        }
        sub="You don't need to write scripts, book studios or chase anyone. Describe the result you want and approve the video you're happy with."
        action={
          <PillButton href="/how-it-works" variant="outline" arrow>
            The full process
          </PillButton>
        }
      />
      <ol className="flex flex-col gap-2">
        {steps.map((step, index) => (
          <li key={step.title}>
            <Block tone={step.tone} pad="lg" className="grid items-center gap-6 lg:grid-cols-12 lg:gap-8">
              <StepNumber n={index + 1} className="text-[72px] lg:col-span-2 lg:text-[120px]" />
              <div className="flex flex-col gap-3 lg:col-span-5">
                <span className="y-chip w-fit">{step.tag}</span>
                <h3 className="y-display y-title">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="y-body y-fg-2 max-w-[50ch]">{step.body}</p>
              </div>
              <div className="w-full max-w-md lg:col-span-5 lg:max-w-none">{step.snippet}</div>
            </Block>
          </li>
        ))}
      </ol>
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
        sub="Everyday presenters, video producers and influencers. Judge them on their portfolio, reviews and on-time record, not their follower count."
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
            <PillButton href="/creators" variant="contrast" arrow>
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
/* Dialects                                                                    */
/* -------------------------------------------------------------------------- */

function Dialects({ exclude }: { exclude: string[] }) {
  const s = useDemo();
  const examples = examplesByLanguage(s, SHOWCASE_DIALECTS, exclude);
  const arabic = languages.filter((l) => l.id !== "en");
  return (
    <section aria-labelledby="dialects-title" className="mt-16 md:mt-24">
      <Block tone="paper" pad="none" className="overflow-hidden">
        <div className="grid gap-10 p-6 md:p-10 lg:grid-cols-12">
          <div className="flex flex-col gap-5 lg:col-span-5">
            <h2 id="dialects-title" className="y-display y-t-display">
              Speak your customer&apos;s <span className="y-strong">dialect</span>
            </h2>
            <p className="y-lead y-fg-2 max-w-[52ch]">
              A shop owner in Riyadh and a student in Cairo don&apos;t scroll for the same voice.
              Find creators who sound like your customers, from Saudi and Khaleeji to Egyptian,
              Levantine, Iraqi and Darija, or formal Fusha for every market at once.
            </p>
            <ul className="flex flex-wrap gap-2" aria-label="Find creators by dialect">
              {arabic.map((lang) => (
                <li key={lang.id}>
                  <QuickLink href={`/creators?lang=${lang.id}`}>
                    {lang.short}
                    <Ar className="y-fg-2 font-medium">{lang.native}</Ar>
                  </QuickLink>
                </li>
              ))}
            </ul>
          </div>
          <ul className="grid grid-cols-2 gap-x-2 gap-y-6 md:grid-cols-4 lg:col-span-7">
            {SHOWCASE_DIALECTS.map((id) => {
              const video = examples[id];
              const lang = languageById[id];
              if (!video) return null;
              const creator = creatorById(s, video.creatorId);
              return (
                <li key={id} className="flex flex-col gap-3">
                  <VideoThumb video={video} frame="9:16" showHook={false} decorative />
                  <div className="flex flex-col gap-1.5 px-1">
                    <p className="y-micro y-fg-2">
                      {lang.short} · <Ar>{lang.native}</Ar>
                      {creator ? <> · {creator.firstName}</> : null}
                    </p>
                    <Ar as="p" className="y-display y-strong text-[19px]">
                      {video.hook}
                    </Ar>
                    {video.hookTranslation ? (
                      <p className="y-micro y-fg-2">“{video.hookTranslation}”</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <Crowd className="block h-44 w-full md:h-64" />
      </Block>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Protection + repeat business                                                */
/* -------------------------------------------------------------------------- */

const protectionTrack = ["Funded", "Delivered", "Approved", "Paid"];

function Dependable() {
  return (
    <section aria-labelledby="dependable-title">
      <SectionHeader
        id="dependable-title"
        title={
          <>
            Dependable from <span className="y-strong">the first video</span>
          </>
        }
        sub="Outsourcing only works if you can count on it. Your money is protected on every commission, and every commission makes the next one easier."
      />
      <div className="grid gap-2 lg:grid-cols-12">
        <Block tone="sky" pad="lg" className="flex flex-col gap-7 lg:col-span-6">
          <IconTile>
            <ShieldCheck size={22} />
          </IconTile>
          <div className="flex flex-col gap-3">
            <h3 className="y-display y-title">Your payment is held until you approve</h3>
            <p className="y-body y-fg-2 max-w-[52ch]">
              When work starts, your payment goes into protection, not to the creator. They&apos;re
              paid the moment you approve the final video.
            </p>
          </div>
          <ol
            aria-label="How a protected payment moves"
            data-tone="paper"
            className="y-block flex items-start justify-between gap-1 !rounded-[24px] p-4"
          >
            {protectionTrack.map((label, index) => (
              <li key={label} className="flex flex-1 flex-col items-center gap-2 text-center">
                <span
                  aria-hidden
                  className="grid size-9 place-items-center rounded-full bg-(--b-fg) text-(--b-bg)"
                >
                  <span className="y-num text-[13px] font-semibold">{index + 1}</span>
                </span>
                <span className="y-micro">{label}</span>
              </li>
            ))}
          </ol>
          <CheckList
            size="small"
            items={[
              "Full refund if the creator doesn't deliver",
              "Revisions included in every package",
              `Auto-approves ${AUTO_APPROVE_DAYS} days after delivery if you don't respond, with reminders first`,
              "Our support team steps in if you can't agree",
            ]}
          />
          <PillButton href="/how-it-works#protection" variant="contrast" arrow className="mt-auto w-fit">
            How protection works
          </PillButton>
        </Block>
        <Block tone="lavender" pad="lg" className="flex flex-col gap-7 lg:col-span-6">
          <IconTile>
            <Repeat2 size={22} />
          </IconTile>
          <div className="flex flex-col gap-3">
            <h3 className="y-display y-title">Commission again, with everything carried forward</h3>
            <p className="y-body y-fg-2 max-w-[52ch]">
              Your product context and the feedback from every past video are saved to the
              product. Rehire a creator in two clicks or brief someone new, and they start from
              what already worked. You never explain your app twice.
            </p>
          </div>
          <MiniLearnings />
          <PillButton href="/how-it-works#business" variant="outline" arrow className="mt-auto w-fit">
            See the whole process
          </PillButton>
        </Block>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Testimonials                                                                */
/* -------------------------------------------------------------------------- */

function Testimonials() {
  const s = useDemo();
  const stats = platformStats(s);
  const reviews = pickReviews(s, TESTIMONIALS, 3);
  if (!reviews.length) return null;
  return (
    <section aria-labelledby="reviews-title">
      <SectionHeader
        id="reviews-title"
        title={
          <>
            Small teams, <span className="y-strong">real results</span>
          </>
        }
        sub={`Creators on Yapp average ${stats.avgRating.toFixed(1)} stars across ${num(stats.reviewCount)} reviews from the businesses that hired them.`}
      />
      <ul className="grid gap-2 lg:grid-cols-3">
        {reviews.map((review) => {
          const business = businessById(s, review.businessId);
          const creator = creatorById(s, review.creatorId);
          return (
            <li key={review.id}>
              <Block as="figure" tone="paper" pad="md" className="flex h-full flex-col justify-between gap-8">
                <div className="flex flex-col gap-4">
                  <StarRow value={review.rating} />
                  <blockquote className="y-display text-[19px] leading-snug md:text-[21px]">
                    <p>“{review.text}”</p>
                  </blockquote>
                </div>
                <figcaption className="flex items-center gap-3 border-t border-(--b-line) pt-4">
                  {business ? <BusinessLogo business={business} size={44} /> : null}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="y-small truncate font-semibold">{review.authorName}</span>
                    <span className="y-micro y-fg-2 truncate">
                      {review.authorTitle}
                      {business ? `, ${business.name}` : ""}
                    </span>
                  </span>
                  {creator ? (
                    <Link
                      href={`/creators/${creator.handle}`}
                      className="y-chip flex-none !min-h-11 !ps-1.5 hover:shadow-[inset_0_0_0_1.5px_var(--b-line)]"
                      aria-label={`Video by ${creator.name}. View profile`}
                    >
                      <FaceAvatar id={creator.id} name="" size={30} />
                      {creator.firstName}
                    </Link>
                  ) : null}
                </figcaption>
              </Block>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Creator lane                                                                */
/* -------------------------------------------------------------------------- */

function CreatorLane() {
  const s = useDemo();
  const open = s.requests
    .filter(
      (r) => r.status === "open" && r.visibility === "public" && r.businessId !== ME.businessId,
    )
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt))
    .slice(0, 4);

  return (
    <section aria-labelledby="creators-lane-title" className="mt-16 md:mt-24">
      <Block tone="night" pad="lg" className="grid gap-10 overflow-hidden lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-6">
          <span className="y-chip w-fit">
            <Mic size={14} aria-hidden />
            For creators
          </span>
          <h2 id="creators-lane-title" className="y-display y-t-display">
            Make videos for apps, <span className="y-strong">get paid reliably</span>
          </h2>
          <p className="y-lead y-fg-2 max-w-[50ch]">
            Natural on camera or great in an edit? Followers are optional. Businesses hire you for
            your portfolio and how you deliver.
          </p>
          <CheckList
            items={[
              "Clear briefs with the product, audience and examples filled in",
              "Payment is secured before you start filming",
              "Keep 100% of your price. Clients pay the service fee",
              "Repeat clients, with their product context and your past work attached",
            ]}
          />
          <div className="flex flex-wrap gap-2 pt-2">
            <PillButton href="/for-creators" variant="neon" size="lg" arrow>
              Start as a creator
            </PillButton>
            <PillButton href="/for-creators#payouts" variant="outline" size="lg">
              How payouts work
            </PillButton>
          </div>
        </div>
        {open.length ? (
          <div className="flex flex-col gap-2 lg:col-span-6 lg:justify-center">
            <p className="y-micro y-fg-2 px-1">Open requests on Yapp right now</p>
            <ul className="flex flex-col gap-2">
              {open.map((request, index) => {
                const business = businessById(s, request.businessId);
                const pitches = pitchesForRequest(s, request.id).length;
                return (
                  <li
                    key={request.id}
                    data-tone={index === 0 ? "paper" : "night"}
                    className={`y-block flex items-center gap-3 !rounded-[22px] p-3 pe-4 md:pe-5 ${index === 0 ? "" : "bg-white/[0.06]"}`}
                  >
                    {business ? <BusinessLogo business={business} size={44} /> : null}
                    <div className="min-w-0 flex-1">
                      <p className="y-small truncate font-semibold">{request.title}</p>
                      <p className="y-micro y-fg-2 truncate">
                        {business?.name} · {formatById[request.brief.format].name} ·{" "}
                        {languageList(request.brief.languages)}
                        {pitches ? ` · ${pitches} pitched` : ""}
                      </p>
                    </div>
                    <span className="y-display y-num flex-none text-[18px] font-semibold tracking-[-0.02em] md:text-[22px]">
                      {moneyRange(request.budget.min, request.budget.max)}
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
        <h2 className="y-display y-t-display max-w-[15ch]">
          Your next video is <span className="y-strong">one brief away</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          <PillButton href="/signup" variant="contrast" size="lg" arrow>
            Get started
          </PillButton>
          <PillButton href="/how-it-works" variant="outline" size="lg">
            See how it works
          </PillButton>
        </div>
        <p className="y-small y-fg-2 flex items-start gap-2">
          <ShieldCheck size={16} aria-hidden className="mt-0.5 flex-none" />
          Posting a request is free. You pay when you hire, and the service fee only when you
          approve.
        </p>
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
