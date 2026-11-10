"use client";

import { Quote } from "lucide-react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { StarRow } from "@/components/domain/stars";
import { PublicShell } from "@/components/shell/app-shell";
import type { AudienceSlug, ServiceSlug } from "@/components/shell/services";
import { Checklist } from "@/components/ui/data";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { CardHead, SectionHead, WidePage } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Stepper } from "@/components/ui/progress";
import { businessById, creatorById, reviewById } from "@/lib/selectors";
import { useDemo } from "@/lib/store";

import { Faq } from "./blocks";
import { serviceContent } from "./service-content";

/**
 * One template for every service and audience page (Site-wide 5.8.4): a hero with one green
 * "Start an order" and a ghost "See creators", how it works in four steps, proof from real reviews
 * in the store, what's included with a pricing note, a short FAQ, and a dark closing bar.
 */
export function ServicePage({ slug }: { slug: ServiceSlug | AudienceSlug }) {
  const s = useDemo();
  const content = serviceContent[slug];
  const facts = content.facts(s);
  const pricing = content.pricing(s);
  const reviews = content.reviews
    .map((id) => reviewById(s, id))
    .filter((review): review is NonNullable<typeof review> => Boolean(review));
  const id = (part: string) => `svc-${slug}-${part}`;

  return (
    <PublicShell>
      <WidePage className="y-svc">
        {/* Hero */}
        <section aria-labelledby={id("title")} className="y-svc-hero">
          <div className="y-svc-hero-l">
            <span className="y-eyebrow">{content.eyebrow}</span>
            <h1 id={id("title")} className="y-display y-svc-h1">
              {content.title}
            </h1>
            <p className="y-lead y-fg-2 y-svc-lead">{content.lead}</p>
            <div className="y-svc-actions">
              <PillButton href={content.start} variant="neon" size="lg" arrow>
                Start an order
              </PillButton>
              <PillButton href={content.creators} variant="soft" size="lg">
                See creators
              </PillButton>
            </div>
          </div>
          <div className="y-block y-svc-facts" data-tone="paper" role="group" aria-labelledby={id("facts")}>
            <CardHead id={id("facts")} title="At a glance" />
            <dl className="y-svc-facts-grid">
              {facts.map((fact) => (
                <div key={fact.label} className="y-svc-fact">
                  <dt className="y-small y-fg-2">{fact.label}</dt>
                  <dd className="y-fig-l">{fact.value}</dd>
                </div>
              ))}
            </dl>
            <p className="y-micro y-fg-2">{content.factsNote}</p>
          </div>
        </section>

        {/* How it works */}
        <section aria-labelledby={id("steps")} className="y-svc-sec">
          <SectionHead id={id("steps")} eyebrow="How it works" title={content.stepsTitle} />
          <Stepper steps={content.steps} label={content.stepsTitle} />
        </section>

        {/* Proof */}
        {reviews.length ? (
          <section aria-labelledby={id("proof")} className="y-svc-sec">
            <SectionHead id={id("proof")} eyebrow="From brands on Yapp" title={content.reviewsTitle} />
            <ul className="y-svc-proof">
              {reviews.map((review) => {
                const creator = creatorById(s, review.creatorId);
                const business = businessById(s, review.businessId);
                return (
                  <li key={review.id} className="y-svc-review">
                    <div className="flex items-center justify-between gap-3">
                      <Quote size={22} aria-hidden className="y-fg-3" />
                      <StarRow value={review.rating} size={15} />
                    </div>
                    <blockquote className="y-body">{review.text}</blockquote>
                    <div className="y-svc-review-foot">
                      {creator ? (
                        <span className="flex min-w-0 items-center gap-2.5">
                          <FaceAvatar id={creator.id} name="" size={36} />
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
                            <span className="y-micro y-fg-2 block truncate">
                              {review.authorName}, {review.authorTitle}
                            </span>
                          </span>
                          <BusinessLogo business={business} size={36} />
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* What's included */}
        <section aria-labelledby={id("included")} className="y-svc-sec">
          <SectionHead id={id("included")} eyebrow="What's included" title={content.includedTitle} />
          <div className="y-svc-included">
            <div className="y-block y-svc-card" data-tone="paper">
              <Checklist items={content.included(s)} className="y-svc-checks" />
            </div>
            <aside className="y-block y-svc-card y-svc-price" data-tone="paper" aria-labelledby={id("price")}>
              <h3 id={id("price")} className="y-head">
                {pricing.title}
              </h3>
              <p className="y-body y-fg-2">{pricing.body}</p>
            </aside>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby={id("faq")} className="y-svc-sec">
          <SectionHead id={id("faq")} eyebrow="FAQ" title="Questions brands ask" />
          <div className="y-block y-svc-card y-svc-faq" data-tone="paper">
            <Faq items={content.faq(s)} />
          </div>
        </section>

        {/* Closing bar */}
        <section aria-labelledby={id("cta")} className="y-svc-sec">
          <div className="y-block y-svc-cta" data-tone="night">
            <div className="relative">
              <h2 id={id("cta")} className="y-display y-title">
                {content.closing.title}
              </h2>
              <p className="y-body y-svc-cta-sub">{content.closing.body}</p>
            </div>
            <PillButton href={content.start} variant="neon" size="lg" arrow className="relative flex-none">
              Start an order
            </PillButton>
          </div>
        </section>
      </WidePage>
    </PublicShell>
  );
}
