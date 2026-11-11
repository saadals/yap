"use client";

import {
  ArrowRight,
  Megaphone,
  MessageSquareText,
  Repeat2,
  ShieldCheck,
  UserRoundSearch,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { CreatorCard } from "@/components/domain/creator-card";
import { VideoThumb } from "@/components/domain/video-thumb";
import { CheckList, Faq, IconTile, MarketingMain, Section, StepNumber } from "@/components/marketing/blocks";
import { brandFaq } from "@/components/marketing/faq-content";
import {
  BUDGET_FLOOR,
  campaignFacts,
  featuredCreators,
  openOrders,
  platformStats,
  sampleVideos,
} from "@/components/marketing/platform";
import { PublicShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { AvatarStack } from "@/components/ui/face-avatar";
import { List, Row } from "@/components/ui/list";
import { PillButton } from "@/components/ui/pill-button";
import { OpenWorkPrice } from "@/components/marketing/open-work-price";
import { visibleComments, visibleReplies } from "@/lib/comments";
import { clock, money, num, plural } from "@/lib/format";
import { defaultMode, homeFor, useRememberedMode } from "@/lib/mode";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { businessById, creatorById, isCampaign, me, startingPrice } from "@/lib/selectors";
import { useDemo, useHydrated, type DemoState } from "@/lib/store";
import { AUTO_APPROVE_DAYS, FEE_PCT, formatById, orderKinds } from "@/lib/taxonomy";

import { VideoWall } from "./video-wall";

/**
 * `/`: the page that explains Yapp to a first-time visitor. Signed-in visitors go straight to
 * their Home (the mode they were last in, else the account's default). The pre-paint script marks
 * <html> with `y-session` when the session cookie exists, and landing.css hides the page until
 * this component settles, so a returning user never sees it flash. A visitor who logged out on
 * purpose has no session cookie, so they see it.
 */
export function Landing() {
  const s = useDemo();
  const hydrated = useHydrated();
  const router = useRouter();
  const { account } = usePrefs();
  const signedIn = hydrated && Boolean(account);
  const current = me.account(s);
  const remembered = useRememberedMode(current.id);
  const destination = homeFor(remembered ?? defaultMode(current));

  useEffect(() => {
    if (signedIn) router.replace(destination);
  }, [signedIn, destination, router]);

  return (
    <div className="y-landing" data-settled={hydrated && !account ? "" : undefined}>
      <PublicShell>
        <MarketingMain>
          <Hero />
          <WaysToOrder />
          <HowItWorks />
          <Protection />
          <FeaturedCreators />
          <ForCreators />
          <Questions />
          <FinalCta />
        </MarketingMain>
      </PublicShell>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */

function Hero() {
  const s = useDemo();
  const stats = platformStats(s);
  const samples = sampleVideos(s, 10);
  const faces = featuredCreators(s, 4).map((c) => ({ id: c.id, name: c.name }));
  return (
    <section aria-labelledby="hero-title" className="grid gap-10 pt-8 md:pt-14 lg:grid-cols-12 lg:items-center lg:gap-12 lg:pt-10">
      <div className="flex flex-col gap-7 lg:col-span-6">
        <p className="y-eyebrow">For app makers and tech brands</p>
        <h1 id="hero-title" className="y-display y-hero -mt-2 text-balance">
          Short videos for your app, made by real creators.
        </h1>
        <p className="y-lead y-fg-2 max-w-[48ch]">
          App demos, testimonials and ad hook packs from people who film on their own phones. The
          price you see is the price you pay, and it&apos;s held until you approve the video.
        </p>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <PillButton href={paths.signIn({ intent: "order" })} variant="neon" size="lg" arrow>
              Get videos made
            </PillButton>
            <PillButton href={paths.signIn({ intent: "make" })} variant="outline" size="lg">
              Make videos, get paid
            </PillButton>
          </div>
          <Link href={paths.discover()} className="y-small inline-flex w-fit items-center gap-1.5 font-medium hover:underline">
            Browse creators first, no account needed
            <ArrowRight size={15} aria-hidden className="y-flip" />
          </Link>
        </div>
        <div className="flex items-center gap-3 border-t border-(--y-line) pt-6">
          <AvatarStack people={faces} size={30} max={4} />
          <p className="y-small y-fg-2">
            <span className="font-semibold text-(--y-ink)">{stats.creators} creators</span> ·{" "}
            {stats.avgRating.toFixed(1)} average from {num(stats.reviewCount)} reviews
          </p>
        </div>
      </div>
      <div className="min-w-0 lg:col-span-6">
        <VideoWall items={samples} />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Three ways to order                                                         */
/* -------------------------------------------------------------------------- */

function WaysToOrder() {
  const s = useDemo();
  const stats = platformStats(s);
  const campaign = campaignFacts();
  const lowest = Math.min(...s.creators.map((c) => startingPrice(c)));
  const ways = [
    {
      icon: <UserRoundSearch size={20} />,
      title: "Pick a creator",
      body: "Watch their videos, choose a package and order straight from their profile.",
      price: `From ${money(lowest)} a video`,
      facts: [`First version in about ${stats.firstDeliveryDays} days`, "Two revisions and raw footage included"],
      cta: { label: "Browse creators", href: paths.discover() },
    },
    {
      icon: <MessageSquareText size={20} />,
      title: "Post a custom order",
      body: "Describe the video, or the ad copy, and set your budget. Creators pitch an idea, a price and a sample.",
      price: `Budgets from ${money(BUDGET_FLOOR)}`,
      facts: ["Compare pitches side by side", "Pay only for the one you hire"],
      cta: { label: "Post a custom order", href: paths.signIn({ intent: "order", next: paths.newOrder({ type: "custom" }) }) },
    },
    {
      icon: <Megaphone size={20} />,
      title: "Run a UGC campaign",
      // The price line below is where a visitor first meets the word: say what one Yapp is.
      body: `${campaign.minVideos} or more creators each make a video and post it on their own account. A Yapp is one creator's video.`,
      price: `You set the price, from ${money(campaign.fromPrice)} a Yapp`,
      facts: ["The follower tier decides who can pick", "Every post checked for your tag and the label"],
      cta: { label: "Start a campaign", href: paths.signIn({ intent: "order", next: paths.newOrder({ type: "campaign" }) }) },
    },
  ];
  return (
    <Section
      id="ways"
      title="Three ways to get videos made"
      sub="Pick how much you want to steer. Every order is protected the same way, with usage rights included in the price."
    >
      <ul className="grid gap-3 md:grid-cols-3">
        {ways.map((way) => (
          <li key={way.title} className="flex">
            <Block tone="paper" pad="md" className="flex w-full flex-col gap-5">
              <div className="flex flex-col gap-3">
                <IconTile>{way.icon}</IconTile>
                <h3 className="y-display y-title">{way.title}</h3>
                <p className="y-body y-fg-2">{way.body}</p>
              </div>
              <p className="y-head y-num">{way.price}</p>
              <CheckList size="small" items={way.facts} />
              <PillButton href={way.cta.href} variant="outline" size="sm" className="mt-auto w-fit">
                {way.cta.label}
              </PillButton>
            </Block>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* How it works                                                                */
/* -------------------------------------------------------------------------- */

const steps = [
  { title: "Write a short brief", body: "Say what the video is for and how you'll use it. Your product's saved details fill in the rest." },
  { title: "Pick who makes it", body: "Choose a creator yourself, or compare pitches with an idea, a price and a sample." },
  { title: "Review with comments", body: "Comment at the exact second that needs work, and the creator replies. Two revisions are included." },
  { title: "Approve and release", body: "The creator is paid when you approve. The video and its raw footage land in your library." },
];

/**
 * A real delivery from the seed with comments on it: the review step, shown rather than described.
 * Prefers timestamped comments, so the sample shows where in the video each one points.
 */
function sampleReview(s: DemoState) {
  for (const commission of s.commissions) {
    for (const delivery of commission.deliveries) {
      const video = delivery.video;
      const comments = visibleComments(delivery).filter((comment) => comment.atSec !== null);
      if (video && video.aspect === "9:16" && comments.length >= 2) {
        return { commission, delivery, video, comments, creator: creatorById(s, commission.creatorId) };
      }
    }
  }
  return null;
}

function HowItWorks() {
  const s = useDemo();
  const review = sampleReview(s);
  return (
    <Section
      id="how"
      title="From brief to approved video"
      sub="No production skills and no back and forth by email. Comments, messages and payment live in one place."
      action={
        <PillButton href={paths.howItWorks} variant="ghost" size="sm" arrow>
          The full process
        </PillButton>
      }
    >
      <Block tone="paper" pad="lg" className="grid gap-10 lg:grid-cols-12 lg:items-center">
        <div className="flex flex-col gap-8 lg:col-span-7">
          <ol className="flex flex-col gap-6">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <StepNumber n={index + 1} />
                <div className="flex flex-col gap-1 pt-1">
                  <h3 className="y-head">
                    <span className="sr-only">Step {index + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="y-body y-fg-2 max-w-[48ch]">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="y-small flex items-start gap-2.5 border-t border-(--b-line) pt-5">
            <Repeat2 size={18} aria-hidden className="mt-px flex-none" />
            <span>
              <span className="font-semibold">Easier every time.</span>{" "}
              <span className="y-fg-2">
                What you learn is saved to your product, so the next brief starts from what worked.
              </span>
            </span>
          </p>
        </div>
        {review ? (
          <div className="lg:col-span-5">
            <div className="y-tile mx-auto flex max-w-[420px] gap-4 p-3">
              <div className="w-[38%] flex-none">
                <VideoThumb video={review.video} frame="9:16" showMeta={false} showHook={false} playable decorative />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3 py-1">
                <div className="flex flex-col">
                  <p className="y-small font-semibold">Version {review.delivery.version}</p>
                  <p className="y-micro y-fg-2 truncate">
                    {review.creator?.firstName ?? "Creator"} · {formatById[review.commission.brief.format]?.name}
                  </p>
                </div>
                <ul className="flex flex-col gap-2" aria-label="Comments on this version">
                  {review.comments.slice(0, 3).map((comment) => (
                    <li key={comment.id} className="rounded-(--y-r-sm) bg-(--y-paper) p-2.5 shadow-[0_0_0_1px_var(--y-line)]">
                      <span className="y-num y-micro inline-block rounded-full bg-(--y-ink) px-2 py-0.5 font-semibold text-(--y-paper)">
                        {comment.atSec !== null ? clock(comment.atSec) : "General"}
                      </span>
                      <p className="y-micro mt-1.5 line-clamp-3">{comment.text}</p>
                      {visibleReplies(comment).length ? (
                        <p className="y-micro y-fg-2 mt-1">
                          {plural(visibleReplies(comment).length, "reply", "replies")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </Block>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Payment protection                                                          */
/* -------------------------------------------------------------------------- */

const flow = [
  { title: "Held", body: "You pay when work starts. Yapp holds it." },
  { title: "Delivered", body: "The creator uploads a version." },
  { title: "Reviewed", body: `You approve or request changes within ${AUTO_APPROVE_DAYS} days.` },
  { title: "Released", body: "The creator is paid. The video is yours." },
];

function Protection() {
  return (
    <Section id="protection">
      <Block tone="night" pad="lg" className="grid gap-10 overflow-hidden lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col gap-5 lg:col-span-5">
          <span aria-hidden className="grid size-11 place-items-center rounded-full bg-(--b-chip)">
            <ShieldCheck size={22} />
          </span>
          <h2 className="y-display y-t-section">Paid only when you approve</h2>
          <p className="y-body y-fg-2 max-w-[44ch]">
            You never pay for a video you didn&apos;t get, and creators never wait on a client who went
            quiet.
          </p>
          <Link
            href={`${paths.howItWorks}#protection`}
            className="y-small inline-flex w-fit items-center gap-1.5 font-medium hover:underline"
          >
            How protection works
            <ArrowRight size={15} aria-hidden className="y-flip" />
          </Link>
        </div>
        <div className="flex flex-col gap-8 lg:col-span-7">
          <ol className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4" aria-label="How a protected payment moves">
            {flow.map((stage, index) => (
              <li key={stage.title} className="flex flex-col gap-2">
                <StepNumber n={index + 1} />
                <span className="y-small font-semibold">{stage.title}</span>
                <span className="y-small y-fg-2">{stage.body}</span>
              </li>
            ))}
          </ol>
          <CheckList
            size="small"
            className="border-t border-(--b-line) pt-6"
            items={[
              "Everything you paid comes back if the video isn't delivered",
              `Approves itself ${AUTO_APPROVE_DAYS} days after delivery if you don't respond, with reminders first`,
              `Nothing added on top: Yapp's ${FEE_PCT}% comes out of the creator's side`,
              "Usage rights, raw footage and two revisions included in the price",
            ]}
          />
        </div>
      </Block>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Featured creators                                                           */
/* -------------------------------------------------------------------------- */

function FeaturedCreators() {
  const s = useDemo();
  const list = featuredCreators(s, 4);
  return (
    <Section
      id="creators"
      title="Creators brands come back to"
      sub="Judge them on their videos, reviews and on-time record, not their follower count."
      action={
        <PillButton href={paths.discover()} variant="outline" size="sm" arrow>
          Browse all creators
        </PillButton>
      }
    >
      <ul className="y-scroll-x -mx-(--y-gutter) flex snap-x scroll-px-(--y-gutter) gap-3 px-(--y-gutter) md:mx-0 md:grid md:grid-cols-2 md:px-0 lg:grid-cols-4">
        {list.map((creator) => (
          <li key={creator.id} className="flex w-[72vw] max-w-[300px] flex-none snap-start md:w-auto md:max-w-none">
            <CreatorCard creator={creator} className="w-full" />
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* For creators                                                                */
/* -------------------------------------------------------------------------- */

function ForCreators() {
  const s = useDemo();
  const open = openOrders(s, undefined, 3);
  const total = s.requests.filter((r) => r.status === "open" && r.visibility === "public").length;
  const points = [
    { icon: <UserRoundSearch size={18} />, title: "Find work", body: `${plural(total, "open custom order or campaign", "open custom orders and campaigns")} from tech brands right now.` },
    {
      icon: <Wallet size={18} />,
      title: `Earn ${100 - FEE_PCT}% of every price`,
      body: `Yapp's ${FEE_PCT}% comes out of the price. You see what you earn before you pitch or pick.`,
    },
    { icon: <ShieldCheck size={18} />, title: "Paid on approval", body: "The money is secured before you film and released when the brand approves." },
  ];
  return (
    <Section id="make">
      <Block tone="paper" pad="lg" className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
        <div className="flex flex-col gap-6 lg:col-span-6">
          <p className="y-eyebrow">For creators</p>
          <h2 className="y-display y-t-section -mt-2">Make videos for tech brands. Get paid when they approve.</h2>
          <ul className="flex flex-col gap-4">
            {points.map((point) => (
              <li key={point.title} className="flex items-start gap-3">
                <IconTile>{point.icon}</IconTile>
                <span className="flex flex-col pt-0.5">
                  <span className="y-head">{point.title}</span>
                  <span className="y-small y-fg-2">{point.body}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <PillButton href={paths.signIn({ intent: "make" })} variant="contrast" arrow>
              Make videos, get paid
            </PillButton>
            <PillButton href={paths.forCreators} variant="ghost">
              How it works for creators
            </PillButton>
          </div>
        </div>
        {open.length ? (
          <div className="flex min-w-0 flex-col gap-2 lg:col-span-6">
            <p className="y-small y-fg-2 px-1 font-medium">Open right now</p>
            <List label="Open custom orders and campaigns" flush className="overflow-hidden rounded-(--y-r-tile) shadow-[inset_0_0_0_1px_var(--y-line)]">
              {open.map((request) => {
                const business = businessById(s, request.businessId);
                return (
                  <Row
                    key={request.id}
                    href={paths.signIn({ intent: "make", next: paths.order(request.id) })}
                    lead={business ? <BusinessLogo business={business} size={40} /> : undefined}
                    title={request.title}
                    meta={`${business?.name ?? "A brand"} · ${isCampaign(request) ? orderKinds.campaign.name : formatById[request.brief.format]?.name}`}
                    end={<OpenWorkPrice request={request} />}
                    chevron={false}
                  />
                );
              })}
            </List>
          </div>
        ) : null}
      </Block>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* FAQ and the last call to action                                             */
/* -------------------------------------------------------------------------- */

function Questions() {
  const s = useDemo();
  const all = brandFaq(s);
  const items = [all.pay, all.campaign, all.rights, all.revisions, all.script, all.accounts];
  return (
    <Section
      id="faq"
      title="Questions, answered"
      action={
        <PillButton href={`${paths.howItWorks}#faq`} variant="ghost" size="sm" arrow>
          More questions
        </PillButton>
      }
    >
      <Block tone="paper" pad="lg" className="!py-2 md:!py-3">
        <Faq items={items} />
      </Block>
    </Section>
  );
}

function FinalCta() {
  return (
    <Section id="start" className="pb-6">
      <Block tone="paper" pad="lg" className="flex flex-col items-center gap-6 py-12 text-center md:py-16">
        <h2 className="y-display y-t-section max-w-[18ch] text-balance">Your next video is one brief away.</h2>
        <p className="y-body y-fg-2 max-w-[46ch]">
          One account to order videos and to make them. Free to join; you only pay for videos you order.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <PillButton href={paths.signIn({ intent: "order" })} variant="neon" size="lg" arrow>
            Get videos made
          </PillButton>
          <PillButton href={paths.signIn({ intent: "make" })} variant="outline" size="lg">
            Make videos, get paid
          </PillButton>
        </div>
      </Block>
    </Section>
  );
}
