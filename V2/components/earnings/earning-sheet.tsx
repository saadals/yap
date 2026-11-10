"use client";

import { BusinessLogo } from "@/components/domain/business-logo";
import { jobKind } from "@/components/studio-jobs/job-status";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { moneyExact } from "@/lib/format";
import { paths } from "@/lib/paths";
import { businessById, commissionTotals } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { FEE_PCT, addonById } from "@/lib/taxonomy";
import type { Commission } from "@/lib/types";

/**
 * One job's money, opened from a row on Earnings: the price the brand paid (and any add-ons),
 * minus Yapp's 20%, equals what you get. The split comes from `commissionTotals` (lib); this only
 * lays it out. `line` says where the money is now (released, pending with its date, or held).
 */
export function EarningSheet({
  commission,
  line,
  onClose,
}: {
  commission: Commission | undefined;
  line: string;
  onClose: () => void;
}) {
  const s = useDemo();
  const c = commission;
  const business = c ? businessById(s, c.businessId) : undefined;
  const split = c ? commissionTotals(c) : undefined;
  const released = c?.payment.status === "released";
  const row = "flex items-baseline justify-between gap-4";

  return (
    <Sheet
      open={Boolean(c)}
      onClose={onClose}
      title={c?.title ?? "Earning"}
      description={c ? [business?.name, jobKind(s, c)].filter(Boolean).join(" · ") : undefined}
      width="sm"
      footer={
        c ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <PillButton variant="ghost" onClick={onClose}>
              Close
            </PillButton>
            <PillButton variant="contrast" href={paths.job(c.id)} arrow>
              Open the job
            </PillButton>
          </div>
        ) : null
      }
    >
      {c && split ? (
        <div className="flex flex-col gap-5">
          {business ? (
            <div className="flex items-center gap-3">
              <BusinessLogo business={business} size={40} />
              <p className="y-small y-fg-2 min-w-0">{line}</p>
            </div>
          ) : (
            <p className="y-small y-fg-2">{line}</p>
          )}
          <dl className="y-tile flex flex-col gap-2.5 !bg-transparent p-4 shadow-[inset_0_0_0_1px_var(--b-line)]" aria-label="How this amount adds up">
            <div className={row}>
              <dt className="y-small">{c.source === "campaign" ? "Price per Yapp" : "Price"}</dt>
              <dd className="y-small y-num font-semibold">{moneyExact(split.price)}</dd>
            </div>
            {c.addons.map((addon) => (
              <div key={addon.id} className={row}>
                <dt className="y-small y-fg-2">+ {addonById[addon.id].name}</dt>
                <dd className="y-small y-num">{moneyExact(addon.price)}</dd>
              </div>
            ))}
            {c.addons.length ? (
              <div className={row}>
                <dt className="y-small">The brand paid</dt>
                <dd className="y-small y-num font-semibold">{moneyExact(split.total)}</dd>
              </div>
            ) : null}
            <div className={row}>
              <dt className="y-small y-fg-2">Yapp&apos;s {FEE_PCT}%</dt>
              <dd className="y-small y-num y-fg-2">−{moneyExact(split.fee)}</dd>
            </div>
            <div className={`${row} border-t border-(--b-line) pt-2.5`}>
              <dt className="y-head">{released ? "You got" : "You get"}</dt>
              <dd className="y-display y-num text-[28px] leading-none tracking-[-0.02em]">{moneyExact(split.creatorEarns)}</dd>
            </div>
          </dl>
          <p className="y-micro y-fg-2">
            The brand pays your price and nothing on top. Yapp&apos;s {FEE_PCT}% comes out of it, and the
            rest is yours.
          </p>
        </div>
      ) : null}
    </Sheet>
  );
}
