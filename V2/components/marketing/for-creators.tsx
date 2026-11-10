"use client";

import { Gift } from "lucide-react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { VideoCard } from "@/components/landing/video-wall";
import { PublicShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { List, Row } from "@/components/ui/list";
import { PillButton } from "@/components/ui/pill-button";
import { creatorNet, money, moneyExact } from "@/lib/format";
import { paths } from "@/lib/paths";
import { businessById, isCampaign, me } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { AUTO_APPROVE_DAYS, FEE_PCT, formatById, formats, jobTypeById, languages, orderKinds } from "@/lib/taxonomy";

import { Faq, type FaqItem, MarketingMain, Section, StepNumber, useStartLinks } from "./blocks";
import { EarningsEstimator } from "./calculators";
import { usageTerms } from "./faq-content";
import { OpenWorkPrice } from "./open-work-price";
import { MARKETING, campaignFacts, openOrders, sampleVideos } from "./platform";

const CAMPAIGN = campaignFacts();

const andList = (items: string[]) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

const NET_PCT = 100 - FEE_PCT;
const example = { price: 140, net: creatorNet(140) };

const faq: FaqItem[] = [
  {
    q: "Do I need a lot of followers?",
    a: `Not for custom orders. Brands order videos for their own accounts and ads, so they look at your portfolio, your reviews and how reliably you deliver. UGC campaigns are different: the brand sets one price per Yapp and a follower tier, starting at ${CAMPAIGN.floor} verified followers on the platform you'll post to. The tier only decides who can pick.`,
  },
  {
    q: "What's a UGC campaign?",
    a: `A brand orders ${CAMPAIGN.minVideos} or more videos, one per creator, at one price per Yapp it sets (from ${money(CAMPAIGN.fromPrice)}, so you earn at least ${moneyExact(CAMPAIGN.fromNet)}). You see the price, what you earn and how the brand will use the video before you pick. Yapps go first come, first served: Pick now, choose the platform you'll post on, upload a review copy within the days the brand set, and once it's approved, post it on your own account with the brand's tag and the paid-partnership label.`,
  },
  {
    q: "How do you check my followers?",
    a: "Connect TikTok, Instagram or Snapchat from your Studio profile. It's read-only: we never post for you. Yapp checks your real followers, and later your campaign posts.",
  },
  {
    q: "Do I need a separate account to make videos?",
    a: "No. One account orders videos and makes them. Add a creator profile to the account you already have, and switch to Studio whenever you're making.",
  },
  {
    q: "What does Yapp charge creators?",
    a: `Yapp keeps ${FEE_PCT}% of every order, campaign Yapp, add-on and paid extra revision. It comes out of what you're paid: on a ${money(example.price)} video you earn ${moneyExact(example.net)}. The brand pays the listed price and nothing on top. You always see what you earn beside the price, before you pitch or pick.`,
  },
  {
    q: "When do I get paid?",
    a: (
      <>
        <p>
          The brand&apos;s payment is secured when the work starts, before you film anything. Your {NET_PCT}% is
          released to your earnings the moment they approve your video, or by itself {AUTO_APPROVE_DAYS} days
          after you deliver if they don&apos;t respond.
        </p>
        <p>
          Campaign pay works differently: after the brand approves your video, you post it, and the pay is
          released {CAMPAIGN.releaseDays} days after we verify the post, as long as it&apos;s still up. Your
          earnings show the exact date. Keep the post up for {CAMPAIGN.keepLiveDays} days.
        </p>
        <p>
          Withdraw any time from {money(MARKETING.minimumPayout)} to a bank account or a digital wallet.
          Transfers usually arrive in {MARKETING.payoutTime}.
        </p>
      </>
    ),
  },
  {
    q: "What if a brand keeps asking for changes?",
    a: "Two revisions are included on every order, and change requests point at comments on the version you delivered. After two rounds the brand can approve, agree a paid extra revision with you, or open a dispute. A person at Yapp replies within 48 hours and decides.",
  },
  {
    q: "What if a brand cancels after I've started?",
    a: "Once you've delivered, a brand can't cancel; they can approve or request the revisions that are included. Before delivery, a cancellation needs your agreement or a decision from Yapp, and work you've already done can be paid in part.",
  },
  {
    q: "Who owns the videos I make?",
    a: `The brand picks how they'll use the video on every order: ${usageTerms()}. It's part of your price, with no separate rights fee, and you see it before you pitch or pick. The raw footage goes with the approved video. You can show the work in your Yapp portfolio unless the brand asks you to keep it private.`,
  },
  {
    q: "Can I write ad copy instead of filming?",
    a: `Yes. ${jobTypeById["ad-copy"].name} is a custom order like any other: pitch on it, deliver the text or a document, and get paid when the brand approves. There's no filming and no posting.`,
  },
  {
    q: "Which languages and formats can I offer?",
    a: `${andList(languages.map((l) => l.name))}. List the languages you're natural in and the formats you're good at: ${andList(formats.map((f) => f.name.toLowerCase()))}.`,
  },
];

const steps = [
  { title: "Build your profile", body: "Your best videos, the languages you speak, the formats you make, and your own prices." },
  {
    title: "Pitch, accept or pick",
    body: `Pitch on custom orders, accept direct orders, or pick a Yapp in a UGC campaign once you have ${CAMPAIGN.floor}+ followers.`,
  },
  { title: "Deliver and get paid", body: `Answer the brand's comments, and get your ${NET_PCT}% when they approve.` },
];

const payoutFlow = [
  { title: "Secured", body: "The brand pays before you film." },
  { title: "Released", body: `When they approve, or ${AUTO_APPROVE_DAYS} days after you deliver.` },
  { title: "Withdrawn", body: `From ${money(MARKETING.minimumPayout)}, to a bank or a wallet.` },
  { title: "In your account", body: `Usually within ${MARKETING.payoutTime}.` },
];

/** /for-creators: how making videos on Yapp works, payouts (`#payouts`), open work, FAQ. */
export function ForCreatorsPage() {
  const start = useStartLinks();
  return (
    <PublicShell>
      <MarketingMain>
        <Hero />
        <Section id="steps" title="How it works for creators">
          <Block tone="paper" pad="lg">
            <ol className="grid gap-8 md:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title} className="flex flex-col gap-3">
                  <StepNumber n={index + 1} />
                  <h3 className="y-head">
                    <span className="sr-only">Step {index + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="y-body y-fg-2 max-w-[38ch]">{step.body}</p>
                </li>
              ))}
            </ol>
          </Block>
        </Section>
        <Section
          id="payouts"
          title={`You earn ${NET_PCT}% of every price`}
          sub={`Yapp keeps ${FEE_PCT}%, taken from your side; the brand pays the listed price. On a ${money(example.price)} video you earn ${moneyExact(example.net)}. Campaign pay is released ${CAMPAIGN.releaseDays} days after we verify your post, as long as it's still up.`}
        >
          <div className="flex flex-col gap-3">
            <Block tone="paper" pad="lg">
              <ol className="grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-8" aria-label="How a payment reaches you">
                {payoutFlow.map((stage, index) => (
                  <li key={stage.title} className="flex flex-col gap-2">
                    <StepNumber n={index + 1} />
                    <span className="y-head">{stage.title}</span>
                    <span className="y-small y-fg-2">{stage.body}</span>
                  </li>
                ))}
              </ol>
            </Block>
            <EarningsEstimator />
          </div>
        </Section>
        <OpenWork />
        <Section id="faq" title="Questions creators ask us">
          <Block tone="paper" pad="lg" className="!py-2 md:!py-3">
            <Faq items={faq} />
          </Block>
        </Section>
        <Section id="start" className="pb-6">
          <Block tone="paper" pad="lg" className="flex flex-col items-center gap-6 py-12 text-center md:py-16">
            <h2 className="y-display y-t-section max-w-[20ch] text-balance">
              Your next client is looking for your voice.
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              <PillButton href={start.make()} variant="neon" size="lg" arrow>
                Make videos, get paid
              </PillButton>
              <PillButton href={paths.howItWorks} variant="outline" size="lg">
                How Yapp works
              </PillButton>
            </div>
          </Block>
        </Section>
      </MarketingMain>
    </PublicShell>
  );
}

function Hero() {
  const start = useStartLinks();
  const s = useDemo();
  const samples = sampleVideos(s, 3);
  return (
    <section aria-labelledby="hero-title" className="grid gap-10 pt-10 md:pt-16 lg:grid-cols-12 lg:items-center">
      <div className="flex flex-col gap-6 lg:col-span-7">
        <p className="y-eyebrow">For presenters, video producers and influencers</p>
        <h1 id="hero-title" className="y-display y-hero -mt-2 text-balance">
          Get paid to talk about tech you&apos;d actually use.
        </h1>
        <p className="y-lead y-fg-2 max-w-[52ch]">
          Tech brands need people who explain their product naturally. Your portfolio gets you hired;
          followers unlock UGC campaigns too.
        </p>
        <div className="flex flex-wrap gap-2">
          <PillButton href={start.make()} variant="neon" size="lg" arrow>
            Make videos, get paid
          </PillButton>
          <PillButton href="#open" variant="outline" size="lg">
            See open work
          </PillButton>
        </div>
        <p className="y-small y-fg-2 flex items-start gap-2">
          <Gift size={16} aria-hidden className="mt-0.5 flex-none" />
          Free to join. One account to make videos and to order them.
        </p>
      </div>
      {samples.length ? (
        <ul className="grid grid-cols-3 gap-3 lg:col-span-5" aria-label="Videos creators made on Yapp">
          {samples.map((item, index) => (
            <li key={item.video.id} className={index === 1 ? "lg:translate-y-8" : ""}>
              <VideoCard item={item} compact />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function OpenWork() {
  const start = useStartLinks();
  const s = useDemo();
  // Signed-out visitors see everything; a signed-in account doesn't see its own orders here.
  const open = openOrders(s, me.ids(s).businessId, 4);
  if (!open.length) return null;
  return (
    <Section
      id="open"
      title="Open work right now"
      sub="Real custom orders and campaigns from tech brands, with the price and what you earn up front."
      action={
        <PillButton href={start.make(paths.findWork())} variant="outline" size="sm" arrow>
          See all open work
        </PillButton>
      }
    >
      <List label="Open custom orders and campaigns">
        {open.map((request) => {
          const business = businessById(s, request.businessId);
          return (
            <Row
              key={request.id}
              href={start.make(paths.order(request.id))}
              lead={business ? <BusinessLogo business={business} size={40} /> : undefined}
              title={request.title}
              meta={`${business?.name ?? "A brand"} · ${isCampaign(request) ? orderKinds.campaign.name : formatById[request.brief.format]?.name}`}
              end={<OpenWorkPrice request={request} />}
            />
          );
        })}
      </List>
    </Section>
  );
}
