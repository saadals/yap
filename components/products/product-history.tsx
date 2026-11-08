"use client";

import { Megaphone, Repeat2 } from "lucide-react";
import Link from "next/link";

import { CommissionBadge, RequestBadge } from "@/components/domain/status-badge";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { money, plural, shortDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import {
  campaignMoney,
  campaignProgress,
  commissionTotals,
  commissionsForBusiness,
  creatorById,
  isCampaign,
  requestsForBusiness,
} from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { useDemo } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";
import type { Commission, ContentRequest } from "@/lib/types";

type HistoryItem =
  | { kind: "commission"; at: string; commission: Commission }
  | { kind: "campaign"; at: string; request: ContentRequest };

/**
 * What the signed-in account ordered for a product: commissions (custom and direct) and UGC
 * campaigns (one row each; their slots are managed on the campaign), newest first.
 */
function productHistory(s: DemoState, productId: string): HistoryItem[] {
  const commissions: HistoryItem[] = commissionsForBusiness(s)
    .filter((c) => c.brief.productId === productId)
    .map((commission) => ({ kind: "commission", at: commission.createdAt, commission }));
  const campaigns: HistoryItem[] = requestsForBusiness(s)
    .filter((r) => isCampaign(r) && r.brief.productId === productId && r.status !== "draft")
    .map((request) => ({ kind: "campaign", at: request.postedAt, request }));
  return [...commissions, ...campaigns].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export const productHistoryCount = (s: DemoState, productId: string) => productHistory(s, productId).length;

/** Every order made for a product, newest first, with "Commission again" on finished commissions. */
export function ProductHistory({ productId }: { productId: string }) {
  const s = useDemo();
  const list = productHistory(s, productId);

  if (!list.length) {
    return (
      <div className="y-tile flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="y-small y-fg-2">No orders for this product yet. Your first brief will start from everything above.</p>
        <PillButton href={paths.newOrder({ product: productId })} variant="soft" size="sm">
          Place an order
        </PillButton>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {list.map((item) =>
        item.kind === "campaign" ? (
          <CampaignRow key={item.request.id} s={s} request={item.request} />
        ) : (
          <CommissionRow key={item.commission.id} s={s} commission={item.commission} />
        ),
      )}
    </ul>
  );
}

const rowClass = "y-tile y-hoverable relative flex flex-col gap-3 p-3 sm:flex-row sm:items-center";
const stretched = "after:absolute after:inset-0 after:rounded-(--y-r-tile) after:content-['']";

function CommissionRow({ s, commission }: { s: DemoState; commission: Commission }) {
  const creator = creatorById(s, commission.creatorId);
  const date = commission.completedAt ?? commission.createdAt;
  return (
    <li className={rowClass}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {creator ? <FaceAvatar id={creator.id} name="" size={40} /> : null}
        <div className="min-w-0 flex-1">
          <p className="y-small truncate font-semibold">
            <Link href={paths.commission(commission.id)} className={stretched}>
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
        <CommissionBadge status={commission.status} side="business" />
        {commission.status === "completed" && creator ? (
          <PillButton
            href={paths.orderCreator(creator.handle, { again: commission.id })}
            variant="outline"
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
}

function CampaignRow({ s, request }: { s: DemoState; request: ContentRequest }) {
  const progress = campaignProgress(s, request);
  const total = campaignMoney(s, request).total;
  return (
    <li className={rowClass}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span aria-hidden className="grid size-10 flex-none place-items-center rounded-full bg-(--b-chip)">
          <Megaphone size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="y-small truncate font-semibold">
            <Link href={paths.order(request.id)} className={stretched}>
              {request.title}
            </Link>
          </p>
          <p className="y-micro y-fg-2 truncate">
            UGC campaign · {progress.approved} of {plural(request.slots, "video")} approved · Posted{" "}
            {shortDate(request.postedAt)} · {money(total)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:flex-none sm:justify-end">
        <RequestBadge status={request.status} campaign />
      </div>
    </li>
  );
}
