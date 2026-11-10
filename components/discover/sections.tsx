"use client";

import { Bell, Check, Lock, Minus, Play, Plus, RotateCcw, ShieldCheck, Tag as TagIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { StarRow } from "@/components/domain/stars";
import { BrandMark } from "@/components/ui/brand";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { Progress, Stepper } from "@/components/ui/progress";
import { SectionHead } from "@/components/ui/page";
import { SampleChip } from "@/components/ui/tags";
import { plural, quoted } from "@/lib/format";
import { paths } from "@/lib/paths";
import { asset } from "@/lib/site";
import type { DemoState } from "@/lib/store";
import { formatById, nicheById } from "@/lib/taxonomy";

import { bandBrands, excerpt, featuredReviews, ratingSummary } from "./data";
import { SAMPLE_COMPARISON, type CompareCell } from "./sample";

/* ------------------------------------------------------------ how it works */

const STEPS = [
  { title: "Post a brief", time: "About 5 minutes", body: "Your product, the goal (installs, sign-ups, sales) and a budget." },
  { title: "Creators pitch", time: "Within 24 hours", body: "Verified tech creators send hook ideas and past Yapps." },
  { title: "Get your Yapps", time: "2–3 days", body: "Several hooks to test, plus raw footage. Two revisions included." },
  { title: "Approve and launch", time: "You stay in control", body: "Payment is released only when you approve. Run them as ads." },
];

/** "How it works": the kit's stepper. Signed-out visitors only (answers, item 43). */
export function HowItWorks() {
  return (
    <section className="y-dsc-sec y-dsc-sales" aria-labelledby="dsc-how-title">
      <SectionHead id="dsc-how-title" eyebrow="How it works" title="From brief to ad-ready in about 3 days" />
      <Stepper steps={STEPS} />
    </section>
  );
}

/* -------------------------------------------------------------- brand band */

/** The green band: brands on Yapp from the seed data, as plain wordmarks in one fixed row. */
export function BrandBand({ s }: { s: DemoState }) {
  const brands = bandBrands(s);
  return (
    <section className="y-dsc-sec y-dsc-band" data-tone="neon" aria-labelledby="dsc-band-title">
      <div className="y-dsc-band-t">
        <h2 id="dsc-band-title">
          Big brands. <br />
          Real voices.
        </h2>
        <span>Teams scaling with Yapp</span>
      </div>
      <ul className="y-dsc-band-l" aria-label="Brands on Yapp">
        {brands.map((brand) => (
          <li key={brand.id}>{brand.name}</li>
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------------- get the app */

const APP_POINTS = [
  { icon: Play, title: "Mix feed", body: "Full-screen tech Yapps, one swipe at a time" },
  { icon: Plus, title: "Order in two taps", body: "Order straight from a creator's reel" },
  { icon: Bell, title: "Live updates", body: "Pitches, deliveries and approvals as they happen" },
];

/** The app's 440 × 956 screen, shown at --k inside the bezel. */
const SCREEN = { w: 440, h: 956 };

/**
 * "Get the app": what the phone app does, one disabled pill until it's listed (answers, item 42),
 * and on desktop a phone showing the real feed, read-only: a frame around `/app-preview`, created
 * only when the section comes within 400px of the screen. Phones get a compact banner instead
 * (Site-wide 5.2.2: the visitor is already on a phone).
 */
export function GetTheApp() {
  return (
    <section className="y-dsc-sec" aria-labelledby="dsc-app-title">
      <div data-tone="paper" className="y-block y-dsc-app">
        <div className="y-dsc-app-l">
          <span className="y-eyebrow">The Yapp app</span>
          <h2 id="dsc-app-title" className="y-display y-dsc-app-h2">
            Your tech feed, <br />
            in your pocket.
          </h2>
          <p className="y-dsc-sub y-dsc-app-sub">
            Yapp, made for your phone. Swipe the Mix feed, open a creator in one tap, and get
            notified the moment your Yapp is ready.
          </p>
          <ul className="y-dsc-app-pts">
            {APP_POINTS.map((point) => (
              <li key={point.title}>
                <span className="y-dsc-app-ic" aria-hidden>
                  <point.icon size={16} strokeWidth={2.2} />
                </span>
                <span>
                  <b>{point.title}</b>
                  <span>{point.body}</span>
                </span>
              </li>
            ))}
          </ul>
          <button type="button" className="y-dsc-soon" disabled>
            Coming soon to the App Store and Google Play
          </button>
          <p className="y-dsc-app-note">
            <b>A live preview of the app&apos;s Home feed</b>, with the same posts as the Yapp app.
            Scroll, switch Mix, Yapps and Orders, and swipe a post for its details. Ordering and the
            other tabs open in the app.
          </p>
        </div>
        <div className="y-dsc-app-r">
          <span aria-hidden className="y-dsc-app-glow" />
          <PhonePreview />
        </div>
      </div>

      <div data-tone="paper" className="y-block y-dsc-appbar">
        {/* eslint-disable-next-line @next/next/no-img-element -- a static icon from public/, no optimisation on static hosting */}
        <img src={asset("/icon-192.png")} alt="" width={48} height={48} className="y-dsc-appbar-ic" />
        <span className="min-w-0 flex-1">
          <b>Get the Yapp app</b>
          <span>Coming soon to the App Store and Google Play</span>
        </span>
        <button type="button" className="y-dsc-soon" data-size="sm" disabled>
          Coming soon
        </button>
      </div>
    </section>
  );
}

/** The phone: a frame around the read-only feed, made only when it nears the screen. */
function PhonePreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    const node = ref.current;
    if (!node || near) return;
    // Desktop only: on phones the banner replaces the phone, so no frame is ever made.
    const desktop = window.matchMedia("(min-width: 1024px)");
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (desktop.matches && entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [near]);

  useEffect(() => {
    if (!near || state !== "loading") return;
    const timer = window.setTimeout(() => setState("failed"), 20000);
    return () => window.clearTimeout(timer);
  }, [near, state]);

  return (
    <div ref={ref} className="y-dsc-dev" aria-label="Yapp app preview" role="group">
      <div className="y-dsc-dev-scr" style={{ "--w": `${SCREEN.w}px`, "--h": `${SCREEN.h}px` } as React.CSSProperties}>
        {near ? (
          <iframe
            title="Yapp app: Home feed preview"
            src={asset(paths.appPreview)}
            width={SCREEN.w}
            height={SCREEN.h}
            onLoad={() => setState("ready")}
            onError={() => setState("failed")}
          />
        ) : null}
        <div className="y-dsc-dev-poster" data-off={state === "ready" ? "true" : undefined} aria-hidden={state === "ready"}>
          <BrandMark size={28} tone="dark" />
          <span>{state === "failed" ? "Preview unavailable" : "Loading preview…"}</span>
        </div>
      </div>
      <span aria-hidden className="y-dsc-dev-island" />
      <span aria-hidden className="y-dsc-dev-btn" data-b="1" />
      <span aria-hidden className="y-dsc-dev-btn" data-b="2" />
      <span aria-hidden className="y-dsc-dev-btn" data-b="3" />
    </div>
  );
}

/* ----------------------------------------------------------------- reviews */

/** Reviews from completed orders, with the real average and count (never rounded up). */
export function Reviews({ s, onOpenCreator }: { s: DemoState; onOpenCreator: (id: string) => void }) {
  const summary = ratingSummary(s);
  const reviews = featuredReviews(s);
  if (!summary.count) return null;
  return (
    <section className="y-dsc-sec" aria-labelledby="dsc-reviews-title">
      <SectionHead id="dsc-reviews-title" eyebrow="From brands" title="Loved by the teams who ship" />
      <div className="y-dsc-revs">
        <div data-tone="neon" className="y-dsc-rsum">
          <span className="y-eyebrow">Average rating</span>
          <span className="y-dsc-rsum-big y-num">
            {summary.average.toFixed(1)}
            <span>/5</span>
          </span>
          <StarRow value={summary.average} size={15} />
          <p>
            {plural(summary.count, "review")} from tech brands, each after a completed order
          </p>
          <ul className="y-dsc-rbars" aria-label="Ratings by stars">
            {summary.distribution.map((row) => {
              const pct = Math.round(row.share * 100);
              return (
                <li key={row.stars}>
                  <span>
                    {row.stars}
                    <span aria-hidden>★</span>
                    <span className="sr-only"> stars</span>
                  </span>
                  <Progress value={row.share} tone="ink" />
                  <b className="y-num">{pct}%</b>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="y-dsc-rgrid">
          {reviews.map(({ review, business, creator }) => (
            <button
              key={review.id}
              type="button"
              data-tone="paper"
              className="y-block y-dsc-rv"
              onClick={() => onOpenCreator(creator.id)}
            >
              <span className="y-dsc-rv-top">
                <span className="y-dsc-bchip">
                  <BusinessLogo business={business} size={26} />
                  {business.name}
                </span>
              </span>
              <span className="y-dsc-rv-q">{quoted(excerpt(review.text))}</span>
              <span className="y-dsc-rchip">{formatById[review.format]?.name}</span>
              <span className="y-dsc-rv-who">
                <FaceAvatar id={creator.id} name="" size={36} />
                <span className="min-w-0 flex-1">
                  Hired <b>{creator.name}</b> · {nicheById[business.industry]?.name}
                </span>
                {/* The stars are the brand's rating of the creator: brands themselves have none (answers, item 20). */}
                <span className="y-dsc-rv-stars" title={`${business.name} rated ${creator.firstName} ${review.rating} out of 5`}>
                  <StarRow value={review.rating} size={12} />
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------- comparison and trust */

function Cell({ value }: { value: CompareCell }) {
  if (value === "yes")
    return (
      <span className="y-dsc-ok">
        <Check size={16} strokeWidth={2.6} aria-hidden />
        <span className="sr-only">Yes</span>
      </span>
    );
  if (value === "no")
    return (
      <span className="y-dsc-no">
        <X size={15} strokeWidth={2.2} aria-hidden />
        <span className="sr-only">No</span>
      </span>
    );
  if (value === "na")
    return (
      <span className="y-dsc-no">
        <Minus size={15} strokeWidth={2.2} aria-hidden />
        <span className="sr-only">Not applicable</span>
      </span>
    );
  return <>{value}</>;
}

const TRUST = [
  { icon: ShieldCheck, title: "Payment held", body: "You pay into Yapp. The creator is paid only after you approve." },
  {
    icon: TagIcon,
    title: "Visible prices",
    body: "Campaigns and creator packages show their price upfront. For a custom order, you set the budget and creators pitch within it.",
  },
  { icon: Check, title: "Verified creators", body: "ID-checked, with real stats pulled from their accounts." },
  { icon: RotateCcw, title: "Two revisions included", body: "Every order includes two rounds of changes, so the video ends up right." },
];

/** The honest comparison and the four trust cards. Signed-out visitors only (answers, item 43). */
export function Comparison() {
  const { columns, rows } = SAMPLE_COMPARISON;
  return (
    <section className="y-dsc-sec y-dsc-sales" aria-labelledby="dsc-compare-title">
      <SectionHead
        id="dsc-compare-title"
        eyebrow="The honest comparison"
        title="Yapp vs. the other ways to get UGC"
        aside={<SampleChip>Sample ranges</SampleChip>}
      />
      <div data-tone="paper" className="y-block y-dsc-cmp">
        <table className="y-dsc-cmpt">
          <caption className="sr-only">
            Yapp against agencies, sourcing creators yourself and AI avatars. Price and time ranges are
            market estimates.
          </caption>
          <thead>
            <tr>
              <td />
              {columns.map((column, index) => (
                <th key={column} scope="col" data-yapp={index === 0 ? "true" : undefined}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {row.cells.map((cell, index) => (
                  <td key={index} data-yapp={index === 0 ? "true" : undefined}>
                    <Cell value={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="y-dsc-footnote">Competitor ranges are market estimates, not quotes.</p>
      <ul className="y-dsc-trust">
        {TRUST.map((card) => (
          <li key={card.title} data-tone="paper" className="y-block">
            <span className="y-dsc-ticon" aria-hidden>
              <card.icon size={18} strokeWidth={2} />
            </span>
            <b>{card.title}</b>
            <p>{card.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------- closing bar */

/** The dark closing bar, signed-out visitors only. "Talk to us" has no page yet, so it's left out. */
export function ClosingBar() {
  return (
    <section className="y-dsc-sec y-dsc-sales" aria-labelledby="dsc-cta-title">
      <div data-tone="night" className="y-dsc-cta">
        <div>
          <h2 id="dsc-cta-title" className="y-display">
            Your first Yapp could be live by Friday.
          </h2>
          <p>
            <Lock size={14} aria-hidden className="me-1.5 inline -translate-y-px" />
            Post a custom order free. Payment is held until you approve the video.
          </p>
        </div>
        <PillButton href={paths.signIn({ next: paths.newOrder(), intent: "ask" })} variant="neon" size="lg">
          New order
        </PillButton>
      </div>
    </section>
  );
}
