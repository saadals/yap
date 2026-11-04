"use client";

import { Package, Plus, Search } from "lucide-react";
import { Fragment } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { Block } from "@/components/ui/block";
import { Cast, teamCast } from "@/components/ui/character";
import { AvatarStack } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { plural } from "@/lib/format";
import { commissionsForBusiness, creatorById, me, requestsForBusiness } from "@/lib/selectors";
import { useDemo } from "@/lib/store";

import { recentPitches } from "./next-step";

/** Page h1: a fixed greeting plus one line that says what needs you and what's moving. */
export function GreetingHero({ className = "" }: { className?: string }) {
  const s = useDemo();
  const business = me.business(s);
  const member = me.member(s);
  const firstName = member.name.split(" ")[0];
  const commissions = commissionsForBusiness(s);
  const toReview = commissions.filter((c) => c.status === "delivered");
  const inProduction = commissions.filter((c) => c.status === "in_progress" || c.status === "revision");
  const newPitches = requestsForBusiness(s)
    .filter((r) => r.status === "open")
    .reduce((sum, r) => sum + recentPitches(s, r.id).length, 0);
  const reviewers = toReview
    .map((c) => creatorById(s, c.creatorId))
    .filter((c) => c !== undefined)
    .map((c) => ({ id: c.id, name: c.name }));

  const parts: React.ReactNode[] = [];
  if (toReview.length)
    parts.push(
      <>
        <AvatarStack people={reviewers} size={34} max={3} className="me-2 -mt-1 align-middle" />
        <span className="y-strong">{plural(toReview.length, "video")} ready for review</span>
      </>,
    );
  if (newPitches)
    parts.push(<span className="y-strong">{plural(newPitches, "new pitch", "new pitches")}</span>);
  if (inProduction.length)
    parts.push(<span className="y-strong">{inProduction.length} in production</span>);

  return (
    <Block tone="paper" pad="lg" className={`relative flex flex-col justify-between gap-8 overflow-hidden ${className}`}>
      <div className="flex items-center gap-3 pe-28">
        <BusinessLogo business={business} size={40} />
        <span className="y-small y-fg-2 min-w-0 truncate font-medium">
          {business.name} · {member.title}
        </span>
      </div>
      <Cast
        members={teamCast}
        viewBox="-4 6 194 102"
        className="absolute end-5 top-5 h-14 w-auto md:end-8 md:top-7 md:h-20"
      />

      <div className="flex flex-col gap-4">
        <h1 className="y-display y-t-display lg:!text-[72px] lg:!leading-[0.98]">
          Good morning, <span className="y-strong">{firstName}</span>
        </h1>
        <p className="y-display y-title max-w-[34ch] !font-normal">
          {parts.length ? (
            <>
              {parts.map((part, index) => (
                <Fragment key={index}>
                  {index > 0 ? (index === parts.length - 1 ? " and " : ", ") : null}
                  {part}
                </Fragment>
              ))}
              .
            </>
          ) : (
            <>Nothing needs you right now. Your creators are on it.</>
          )}
        </p>
      </div>

      <nav aria-label="Quick actions" className="flex flex-wrap gap-2">
        <PillButton href="/business/requests/new" variant="contrast" icon={<Plus size={18} aria-hidden />}>
          New request
        </PillButton>
        <PillButton href="/creators" variant="outline" icon={<Search size={18} aria-hidden />}>
          Find creators
        </PillButton>
        <PillButton href="/business/products/new" variant="outline" icon={<Package size={18} aria-hidden />}>
          Add product
        </PillButton>
      </nav>
    </Block>
  );
}
