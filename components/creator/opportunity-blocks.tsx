"use client";

import { BadgeCheck, Briefcase, CalendarDays, Lightbulb, MapPin, ShieldCheck, Users } from "lucide-react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { Rating } from "@/components/domain/stars";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { AvatarStack } from "@/components/ui/face-avatar";
import { money, moneyRange, monthYearOf, plural } from "@/lib/format";
import { cityLabel, creatorById } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import type { Business, ContentRequest, Pitch, Product } from "@/lib/types";

import { median } from "./pitch-helpers";

/** Who's asking: logo, name, trust signals. */
export function BusinessBlock({ business }: { business: Business }) {
  return (
    <Block tone="paper" pad="md" className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <BusinessLogo business={business} size={56} />
        <div className="min-w-0 flex-1">
          <p className="y-micro y-fg-2">Posted by</p>
          <h2 className="y-head flex items-center gap-1.5">
            {business.name}
            {business.verified ? <BadgeCheck size={17} aria-label="Verified business" /> : null}
          </h2>
          <p className="y-small y-fg-2">{business.tagline}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {business.paymentVerified ? (
          <Badge tone="info" icon={<ShieldCheck size={14} aria-hidden />}>
            Payment verified
          </Badge>
        ) : (
          <Badge tone="neutral" icon={<ShieldCheck size={14} aria-hidden />}>
            Payment not verified yet
          </Badge>
        )}
        <span className="y-chip">
          <Briefcase size={14} aria-hidden /> {plural(business.hires, "hire")}
        </span>
        <span className="y-chip">
          <Rating value={business.clientRating} />
          <span className="y-fg-2">from creators</span>
        </span>
        <span className="y-chip">
          <CalendarDays size={14} aria-hidden /> Member since {monthYearOf(business.memberSince)}
        </span>
        <span className="y-chip">
          <MapPin size={14} aria-hidden /> {cityLabel(business.cityId)}
        </span>
      </div>
    </Block>
  );
}

/** Tone, dos and don'ts, and learnings the business saved from earlier commissions. */
export function ProductContext({ product }: { product: Product }) {
  return (
    <div className="flex flex-col gap-5 border-t border-(--b-line) pt-6">
      <div className="flex flex-col gap-1">
        <h3 className="y-head">About {product.name}</h3>
        <p className="y-body y-fg-2 max-w-[62ch]">{product.description}</p>
      </div>
      {product.tone.length ? (
        <div className="flex flex-col gap-2">
          <h4 className="y-micro y-fg-2">Tone</h4>
          <div className="flex flex-wrap gap-1.5">
            {product.tone.map((t) => (
              <span key={t} className="y-chip">
                {t}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {product.dos.length ? (
          <div className="flex flex-col gap-2">
            <h4 className="y-micro y-fg-2">Do</h4>
            <ul className="flex flex-col gap-1.5">
              {product.dos.map((item) => (
                <li key={item} className="y-small flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 flex-none rounded-full bg-current" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {product.donts.length ? (
          <div className="flex flex-col gap-2">
            <h4 className="y-micro y-fg-2">Don&apos;t</h4>
            <ul className="flex flex-col gap-1.5">
              {product.donts.map((item) => (
                <li key={item} className="y-small flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 flex-none rounded-full bg-current" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      {product.learnings.length ? (
        <div className="y-tile flex flex-col gap-3 p-4">
          <h4 className="y-small flex items-center gap-2 font-semibold">
            <Lightbulb size={16} aria-hidden /> What&apos;s worked before for {product.name}
          </h4>
          <ul className="flex flex-col gap-2">
            {product.learnings.slice(0, 4).map((l) => (
              <li key={l.id} className="y-small flex gap-2">
                <span aria-hidden className="mt-2 size-1.5 flex-none rounded-full bg-current" />
                {l.text}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Competition and the payment promise (night block). */
export function CompetitionBlock({
  request,
  pitches,
  business,
  myPitch,
}: {
  request: ContentRequest;
  pitches: Pitch[];
  business?: Business;
  myPitch?: Pitch;
}) {
  const s = useDemo();
  const others = pitches.filter((p) => p.id !== myPitch?.id);
  const typical = median(pitches.map((p) => p.price));
  const faces = others
    .map((p) => creatorById(s, p.creatorId))
    .filter((c) => c !== undefined)
    .map((c) => ({ id: c.id, name: c.name }));
  return (
    <Block tone="night" pad="md" className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="y-micro y-fg-2">Competition</p>
          <p className="y-display y-num text-[44px] leading-none font-semibold tracking-[-0.04em]">
            {pitches.length}
          </p>
          <p className="y-small mt-1 font-semibold">
            {pitches.length === 1 ? "pitch so far" : "pitches so far"}
            {myPitch ? " · including yours" : ""}
          </p>
        </div>
        {faces.length ? <AvatarStack people={faces} size={32} max={4} /> : null}
      </div>
      <dl className="grid grid-cols-2 gap-2">
        <div className="y-tile flex flex-col gap-1 p-3">
          <dt className="y-micro y-fg-2">Typical quote</dt>
          <dd className="y-head y-num">{typical !== undefined ? money(typical) : "None yet"}</dd>
        </div>
        <div className="y-tile flex flex-col gap-1 p-3">
          <dt className="y-micro y-fg-2">Their budget</dt>
          <dd className="y-head y-num">{moneyRange(request.budget.min, request.budget.max)}</dd>
        </div>
      </dl>
      {pitches.length === 0 && request.status === "open" ? (
        <p className="y-small y-fg-2 flex items-center gap-2">
          <Users size={16} aria-hidden /> Be the first to pitch. Early pitches get read first.
        </p>
      ) : null}
      <div className="flex items-start gap-3 border-t border-(--b-line) pt-4">
        <ShieldCheck size={22} aria-hidden className="mt-0.5 flex-none" />
        <div className="flex flex-col gap-1">
          <p className="y-small font-semibold">Payment is secured before you start</p>
          <p className="y-micro y-fg-2">
            {business?.name ?? "The business"} pays the full price into protection when they hire
            you. It&apos;s released to you on approval, or automatically 3 days after you deliver.
            You keep 100% of your price.
          </p>
        </div>
      </div>
    </Block>
  );
}
