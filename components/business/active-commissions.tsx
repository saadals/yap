"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { CommissionCard } from "@/components/domain/commission-card";
import { Block } from "@/components/ui/block";
import { PillButton } from "@/components/ui/pill-button";
import { commissionsForBusiness, isActive } from "@/lib/selectors";
import { useDemo } from "@/lib/store";

/** Commissions in flight, the ones that need you first. */
export function ActiveCommissions({ className = "", limit = 4 }: { className?: string; limit?: number }) {
  const s = useDemo();
  const active = commissionsForBusiness(s).filter(isActive);
  const shown = active.slice(0, limit);

  return (
    <Block as="section" aria-labelledby="active-title" tone="mist" pad="sm" className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-1">
        <h2 id="active-title" className="y-display y-title">
          Active commissions <span className="y-fg-3 y-num">{active.length}</span>
        </h2>
        <PillButton href="/business/commissions" variant="ghost" size="sm" icon={<ArrowRight size={16} aria-hidden className="y-flip order-last" />}>
          All commissions
        </PillButton>
      </div>
      {shown.length ? (
        <ul className="grid gap-2 md:grid-cols-2">
          {shown.map((commission) => (
            <li key={commission.id} className="flex">
              <CommissionCard commission={commission} role="business" className="w-full" />
            </li>
          ))}
        </ul>
      ) : (
        <div data-tone="paper" className="y-block flex flex-col items-center gap-3 px-5 py-8 text-center">
          <p className="y-head">Nothing in production</p>
          <p className="y-small y-fg-2 max-w-[40ch]">
            Post a request or commission a creator you&apos;ve worked with. Work shows up here the
            moment it starts.
          </p>
          <PillButton href="/business/requests/new" variant="contrast" size="sm">
            Post a request
          </PillButton>
        </div>
      )}
      {active.length > shown.length ? (
        <p className="y-small y-fg-2 px-2 pb-1">
          +{active.length - shown.length} more in{" "}
          <Link href="/business/commissions" className="y-link font-semibold text-(--b-fg)">
            Commissions
          </Link>
        </p>
      ) : null}
    </Block>
  );
}
