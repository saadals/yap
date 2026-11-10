"use client";

import { ArrowRight, Quote } from "lucide-react";
import Link from "next/link";

import { BusinessLogo } from "@/components/domain/business-logo";
import { StarRow } from "@/components/domain/stars";
import { CheckList, Faq, IconTile, MarketingMain, Section, StepNumber, useStartLinks } from "@/components/marketing/blocks";
import { PublicShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { paths } from "@/lib/paths";
import { businessById, creatorById, reviewById } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { orderKinds } from "@/lib/taxonomy";

import { serviceBySlug, services, type CatalogueSlug } from "./catalogue";
import { serviceContent } from "./content";

/**
 * One template for the five service pages (round 3 answers, item 37), in V2's marketing style: a
 * hero with the one green start button and the live figures beside it, how it works in four steps,
 * proof from real reviews in the store, what's included with what it costs, a short FAQ and a
 * closing call to action. The start button opens the matching order; signed out, it goes through
 * sign-in as someone ordering, with the order as `next`.
 */
export function ServicePage({ slug }: { slug: CatalogueSlug }) {
  const s = useDemo();
  const start = useStartLinks();
  const content = serviceContent[slug];
  const entry = serviceBySlug[slug];
  const Icon = entry.icon;
  const startHref = start.order(content.start.next);
  // Live figures from the store (the seed's until it loads; orders created in this browser count too).
  const facts = content.facts(s);
  const pricing = content.pricing(s);
  const reviews = content.reviews
    .map((id) => reviewById(s, id))
    .filter((review): review is NonNullable<typeof review> => Boolean(review));
  const others = services.filter((item) => item.slug !== slug);
  // In a sentence: "a custom order", "a UGC campaign" (the names keep their capitals elsewhere).
  const inSentence = (kind: "custom" | "campaign") =>
    kind === "custom" ? orderKinds.custom.name.toLowerCase() : orderKinds.campaign.name;
  const runsOn =
    entry.runsOn === "both" ? `${inSentence("custom")} or a ${inSentence("campaign")}` : inSentence(entry.runsOn);

  return (
    <PublicShell>
      <MarketingMain>
        {/* Hero */}
        <section
          aria-labelledby="svc-title"
          className="grid gap-10 pt-10 md:pt-16 lg:grid-cols-12 lg:items-center lg:gap-12"
        >
          <div className="flex flex-col gap-6 lg:col-span-7">
            <Link
              href={paths.services}
              className="y-eyebrow inline-flex w-fit items-center gap-2 hover:underline"
              aria-label={`${content.eyebrow}, one of Yapp's services. See all services`}
            >
              <Icon size={16} aria-hidden />
              {content.eyebrow}
            </Link>
            <h1 id="svc-title" className="y-display y-hero -mt-2 max-w-[18ch] text-balance">
              {content.title}
            </h1>
            <p className="y-lead y-fg-2 max-w-[52ch]">{content.lead}</p>
            <div className="flex flex-wrap gap-2">
              <PillButton href={startHref} variant="neon" size="lg" arrow>
                {content.start.label}
              </PillButton>
              <PillButton href={content.creators} variant="outline" size="lg">
                See creators
              </PillButton>
            </div>
            <p className="y-small y-fg-2">Runs as a {runsOn}. The price you agree is the price you pay.</p>
          </div>
          <Block
            tone="paper"
            pad="lg"
            className="flex flex-col gap-5 lg:col-span-5"
            aria-labelledby="svc-facts"
          >
            <h2 id="svc-facts" className="y-head">
              At a glance
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
              {facts.map((fact) => (
                <div key={fact.label} className="flex flex-col-reverse gap-1">
                  <dt className="y-small y-fg-2">{fact.label}</dt>
                  <dd className="y-title y-num">{fact.value}</dd>
                </div>
              ))}
            </dl>
            <p className="y-micro y-fg-2 border-t border-(--b-line) pt-4">{content.factsNote}</p>
          </Block>
        </section>

        {/* How it works */}
        <Section id="steps" eyebrow="How it works" title={content.stepsTitle}>
          <Block tone="paper" pad="lg">
            <ol className="grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-4">
              {content.steps.map((step, index) => (
                <li key={step.title} className="flex flex-col gap-3">
                  <StepNumber n={index + 1} />
                  <h3 className="y-head">
                    <span className="sr-only">Step {index + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="y-body y-fg-2">{step.body}</p>
                </li>
              ))}
            </ol>
          </Block>
        </Section>

        {/* Proof */}
        {reviews.length ? (
          <Section id="proof" eyebrow="From brands on Yapp" title={content.reviewsTitle}>
            <ul className="grid gap-3 md:grid-cols-3">
              {reviews.map((review) => {
                const creator = creatorById(s, review.creatorId);
                const business = businessById(s, review.businessId);
                return (
                  <li key={review.id} className="flex">
                    <Block tone="paper" pad="md" className="flex w-full flex-col gap-4">
                      <div className="flex items-center justify-between gap-3">
                        <Quote size={20} aria-hidden className="y-fg-2" />
                        <StarRow value={review.rating} size={15} />
                      </div>
                      <blockquote className="y-body flex-1">{review.text}</blockquote>
                      <div className="flex items-center justify-between gap-3 border-t border-(--b-line) pt-4">
                        {creator ? (
                          <span className="flex min-w-0 items-center gap-2.5">
                            <FaceAvatar id={creator.id} name="" size={32} />
                            <span className="min-w-0">
                              <span className="y-small block truncate font-semibold">{creator.name}</span>
                              <span className="y-micro y-fg-2 block truncate">Creator</span>
                            </span>
                          </span>
                        ) : null}
                        {business ? (
                          <span className="flex min-w-0 items-center gap-2.5 text-end">
                            <span className="min-w-0">
                              <span className="y-small block truncate font-semibold">{business.name}</span>
                              <span className="y-micro y-fg-2 block truncate">{review.authorName}</span>
                            </span>
                            <BusinessLogo business={business} size={32} />
                          </span>
                        ) : null}
                      </div>
                    </Block>
                  </li>
                );
              })}
            </ul>
          </Section>
        ) : null}

        {/* What's included, and what it costs */}
        <Section id="included" eyebrow="What's included" title={content.includedTitle}>
          <div className="grid gap-3 lg:grid-cols-12">
            <Block tone="paper" pad="lg" className="lg:col-span-7">
              <CheckList items={content.included(s)} />
            </Block>
            <Block tone="paper" pad="lg" className="flex flex-col gap-3 lg:col-span-5" aria-labelledby="svc-price">
              <h3 id="svc-price" className="y-display y-title">
                {pricing.title}
              </h3>
              <p className="y-body y-fg-2">{pricing.body}</p>
              <Link
                href={`${paths.howItWorks}#pricing`}
                className="y-small mt-auto inline-flex w-fit items-center gap-1.5 pt-2 font-medium hover:underline"
              >
                How pricing works
                <ArrowRight size={15} aria-hidden className="y-flip" />
              </Link>
            </Block>
          </div>
        </Section>

        {/* FAQ */}
        <Section id="faq" eyebrow="FAQ" title="Questions brands ask">
          <Block tone="paper" pad="lg" className="!py-2 md:!py-3">
            <Faq items={content.faq(s)} />
          </Block>
        </Section>

        {/* Closing */}
        <Section id="start" className="pb-6">
          <Block tone="paper" pad="lg" className="flex flex-col items-center gap-6 py-12 text-center md:py-16">
            <h2 className="y-display y-t-section max-w-[20ch] text-balance">{content.closing.title}</h2>
            <p className="y-body y-fg-2 max-w-[46ch]">{content.closing.body}</p>
            <PillButton href={startHref} variant="neon" size="lg" arrow>
              {content.start.label}
            </PillButton>
          </Block>
          <nav aria-label="Other services" className="flex flex-col gap-3 pt-8">
            <p className="y-small y-fg-2 font-medium">Other services</p>
            <ul className="flex flex-wrap gap-2">
              {others.map((item) => {
                const OtherIcon = item.icon;
                return (
                  <li key={item.slug}>
                    <PillButton href={item.href} variant="soft" size="sm" icon={<OtherIcon size={15} aria-hidden />}>
                      {item.title}
                    </PillButton>
                  </li>
                );
              })}
            </ul>
          </nav>
        </Section>
      </MarketingMain>
    </PublicShell>
  );
}

/** Square icon for a service, for lists. */
export function ServiceIcon({ slug }: { slug: CatalogueSlug }) {
  const Icon = serviceBySlug[slug].icon;
  return (
    <IconTile>
      <Icon size={20} />
    </IconTile>
  );
}
