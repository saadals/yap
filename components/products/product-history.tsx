"use client";

import { Repeat2 } from "lucide-react";
import Link from "next/link";

import { CommissionBadge } from "@/components/domain/status-badge";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { money, shortDate } from "@/lib/format";
import { commissionTotals, creatorById } from "@/lib/selectors";
import { ME, useDemo } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";

/** Every commission made for a product, newest first, with "Commission again" on finished ones. */
export function ProductHistory({ productId }: { productId: string }) {
  const s = useDemo();
  const list = s.commissions
    .filter((c) => c.businessId === ME.businessId && c.brief.productId === productId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  if (!list.length) {
    return (
      <div className="y-tile flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="y-small y-fg-2">No commissions for this product yet. Your first brief will start from everything above.</p>
        <PillButton href={`/business/requests/new?product=${productId}`} variant="soft" size="sm">
          Post a request
        </PillButton>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {list.map((commission) => {
        const creator = creatorById(s, commission.creatorId);
        const date = commission.completedAt ?? commission.createdAt;
        return (
          <li key={commission.id} className="y-tile y-hoverable relative flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {creator ? <FaceAvatar id={creator.id} name="" size={40} /> : null}
              <div className="min-w-0 flex-1">
                <p className="y-small truncate font-semibold">
                  <Link
                    href={`/business/commissions/${commission.id}`}
                    className="after:absolute after:inset-0 after:rounded-(--y-r-tile) after:content-['']"
                  >
                    {commission.title}
                  </Link>
                </p>
                <p className="y-micro y-fg-2 truncate">
                  {creator?.name} · {formatById[commission.brief.format].name} ·{" "}
                  {commission.status === "completed" ? "Completed" : "Started"} {shortDate(date)} ·{" "}
                  {money(commissionTotals(commission).total)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:flex-none sm:justify-end">
              <CommissionBadge status={commission.status} />
              {commission.status === "completed" && creator ? (
                <PillButton
                  href={`/creators/${creator.handle}/commission?repeat=${commission.id}`}
                  variant="contrast"
                  size="sm"
                  icon={<Repeat2 size={16} aria-hidden />}
                  className="relative z-[3]"
                >
                  Commission again
                </PillButton>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
