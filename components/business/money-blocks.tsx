"use client";

import { ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";

import { Block } from "@/components/ui/block";
import { MiniBars } from "@/components/ui/charts";
import { NOW } from "@/lib/clock";
import { money, plural } from "@/lib/format";
import { businessSpend, commissionTotals, creatorById } from "@/lib/selectors";
import { ME, useDemo } from "@/lib/store";

const kpi = "y-display y-num text-[44px] leading-none font-semibold tracking-[-0.04em]";

/** Last `count` calendar months (oldest first) as "YYYY-MM" keys and short labels. */
function recentMonths(count: number) {
  const now = new Date(NOW);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - i), 1));
    return {
      key: d.toISOString().slice(0, 7),
      label: d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" }),
      long: d.toLocaleString("en-GB", { month: "long", timeZone: "UTC" }),
    };
  });
}

/** Butter = money spent; sky = money protected (held until you approve). */
export function MoneyBlocks({ className = "" }: { className?: string }) {
  const s = useDemo();
  const spend = businessSpend(s);
  const mine = s.commissions.filter((c) => c.businessId === ME.businessId);
  const released = mine.filter((c) => c.payment.status === "released");
  const months = recentMonths(4);
  const monthly = months.map((m) =>
    released
      .filter((c) => (c.completedAt ?? c.createdAt).slice(0, 7) === m.key)
      .reduce((sum, c) => sum + commissionTotals(c).total, 0),
  );
  const thisMonth = months[months.length - 1];
  const approvedThisMonth = released.filter(
    (c) => (c.completedAt ?? c.createdAt).slice(0, 7) === thisMonth.key,
  ).length;

  const held = mine.filter((c) => c.payment.status === "held");
  const authorized = mine.filter((c) => c.payment.status === "authorized");
  const offerNames = authorized
    .map((c) => creatorById(s, c.creatorId)?.firstName)
    .filter(Boolean)
    .join(", ");

  return (
    <div className={`grid gap-2 sm:grid-cols-2 lg:grid-cols-1 ${className}`}>
      <Block as="section" aria-labelledby="spent-title" tone="butter" pad="md" className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-2">
          <h2 id="spent-title" className="y-small font-semibold">
            Spent this month
          </h2>
          <Wallet size={20} aria-hidden />
        </div>
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className={kpi}>{money(spend.thisMonth)}</p>
            <p className="y-micro y-fg-2 mt-1.5">
              {approvedThisMonth
                ? `${plural(approvedThisMonth, "video")} approved in ${thisMonth.long}`
                : `Nothing approved yet in ${thisMonth.long}`}
            </p>
          </div>
          <MiniBars values={monthly} labels={months.map((m) => m.label)} className="!h-20 w-32 flex-none" />
        </div>
        <p className="sr-only">
          Spend by month: {months.map((m, i) => `${m.long} ${money(monthly[i])}`).join(", ")}.
        </p>
        <p className="y-small flex flex-wrap items-center justify-between gap-2 border-t border-(--b-line) pt-3">
          <span className="y-fg-2">
            {money(spend.spent)} across {plural(spend.completedCount, "video")}
          </span>
          <Link href="/business/billing" className="y-link font-semibold">
            Receipts
          </Link>
        </p>
      </Block>

      <Block as="section" aria-labelledby="protected-title" tone="sky" pad="md" className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-2">
          <h2 id="protected-title" className="y-small font-semibold">
            Protected right now
          </h2>
          <ShieldCheck size={20} aria-hidden />
        </div>
        <div>
          <p className={kpi}>{money(spend.held + spend.authorized)}</p>
          <p className="y-micro y-fg-2 mt-1.5">
            {held.length
              ? `Held for ${plural(held.length, "commission")}. Released only when you approve.`
              : "Nothing held right now."}
          </p>
        </div>
        <p className="y-small y-fg-2 border-t border-(--b-line) pt-3">
          {authorized.length
            ? `${money(spend.authorized)} is only authorised for ${authorized.length === 1 ? `${offerNames}'s offer` : `${authorized.length} offers`}. You're charged if they accept.`
            : "If a creator doesn't deliver, you get a full refund."}
        </p>
      </Block>
    </div>
  );
}
