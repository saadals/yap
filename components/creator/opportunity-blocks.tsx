"use client";

import { BadgeCheck, Check, Minus, Users } from "lucide-react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { Block } from "@/components/ui/block";
import { MatchScore } from "@/components/ui/match-score";
import { money, plural, timeAgo } from "@/lib/format";
import type { Fit } from "@/lib/selectors";
import type { Business, ContentRequest, Pitch, Product } from "@/lib/types";

import { median } from "./pitch-helpers";

/** Who's asking, as one quiet row: logo, name and trust signals in a plain meta line. */
export function BusinessRow({ business, request }: { business: Business; request: ContentRequest }) {
  const meta = [
    business.paymentVerified ? "Payment verified" : "Payment not verified yet",
    plural(business.hires, "hire"),
    `Rated ${business.clientRating.toFixed(1)} by creators`,
    `Posted ${timeAgo(request.postedAt)}`,
  ].join(" · ");
  return (
    <div className="flex items-center gap-3">
      <BusinessLogo business={business} size={40} />
      <div className="min-w-0 flex-1">
        <p className="y-small flex items-center gap-1.5 font-semibold">
          {business.name}
          {business.verified ? <BadgeCheck size={16} aria-label="Verified business" /> : null}
        </p>
        <p className="y-micro y-fg-2">{meta}</p>
      </div>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={item} className="y-small flex gap-2">
          <span aria-hidden className="mt-2 size-1.5 flex-none rounded-full bg-current" />
          {item}
        </li>
      ))}
    </ul>
  );
}

/** About the product (tone, dos and don'ts) and saved learnings, behind one disclosure. */
export function ProductDetails({ product }: { product: Product }) {
  const hint = [
    product.tone.length || product.dos.length || product.donts.length ? "Tone, dos and don'ts" : null,
    product.learnings.length ? plural(product.learnings.length, "learning") : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <details className="group border-t border-(--b-line) pt-3">
      <summary className="y-small flex cursor-pointer list-none items-center justify-between gap-2 py-1 font-semibold [&::-webkit-details-marker]:hidden">
        About {product.name}
        <span className="y-micro y-fg-2 font-normal group-open:hidden">{hint}</span>
      </summary>
      <div className="flex flex-col gap-5 pt-3">
        <div className="flex flex-col gap-1">
          <p className="y-body max-w-[62ch]">{product.description}</p>
          {product.tone.length ? (
            <p className="y-small y-fg-2">Tone: {product.tone.join(", ").toLowerCase()}</p>
          ) : null}
        </div>
        {product.dos.length || product.donts.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {product.dos.length ? (
              <div className="flex flex-col gap-2">
                <h3 className="y-micro y-fg-2">Do</h3>
                <Bullets items={product.dos} />
              </div>
            ) : null}
            {product.donts.length ? (
              <div className="flex flex-col gap-2">
                <h3 className="y-micro y-fg-2">Don&apos;t</h3>
                <Bullets items={product.donts} />
              </div>
            ) : null}
          </div>
        ) : null}
        {product.learnings.length ? (
          <div className="flex flex-col gap-2">
            <h3 className="y-micro y-fg-2">What&apos;s worked before</h3>
            <Bullets items={product.learnings.slice(0, 4).map((l) => l.text)} />
          </div>
        ) : null}
      </div>
    </details>
  );
}

/** The one side block: fit score with top reasons, a line on competition, and the action. */
export function FitAside({
  fit,
  request,
  pitches,
  myPitch,
  action,
}: {
  fit: Fit;
  request: ContentRequest;
  pitches: Pitch[];
  myPitch?: Pitch;
  action?: React.ReactNode;
}) {
  const typical = median(pitches.map((p) => p.price));
  const competition =
    pitches.length === 0
      ? request.status === "open"
        ? "No pitches yet. Early pitches get read first."
        : "No pitches"
      : [
          `${plural(pitches.length, "pitch", "pitches")} so far${myPitch ? ", including yours" : ""}`,
          typical !== undefined ? `typical quote ${money(typical)}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
  return (
    <Block tone="lavender" pad="md" className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <h2 className="y-head">Your fit</h2>
        <MatchScore value={fit.score} label="fit" showBar={false} />
      </div>
      <ul className="flex flex-col gap-1.5">
        {fit.reasons.slice(0, 3).map((reason) => (
          <li key={reason} className="y-small flex items-start gap-2">
            <Check size={16} strokeWidth={2.75} aria-hidden className="mt-0.5 flex-none" />
            {reason}
          </li>
        ))}
        {fit.gaps.slice(0, 1).map((gap) => (
          <li key={gap} className="y-small y-fg-2 flex items-start gap-2">
            <Minus size={16} strokeWidth={2.75} aria-hidden className="mt-0.5 flex-none" />
            <span>
              <span className="sr-only">Gap: </span>
              {gap}
            </span>
          </li>
        ))}
      </ul>
      <p className="y-small flex items-center gap-2 border-t border-(--b-line) pt-3">
        <Users size={16} aria-hidden className="flex-none" />
        {competition}
      </p>
      {action}
    </Block>
  );
}
