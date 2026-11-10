"use client";

import Link from "next/link";

import { BusinessLogo } from "@/components/domain/business-logo";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { StageBars } from "@/components/ui/progress";
import { StatusChip } from "@/components/ui/tags";
import { paths } from "@/lib/paths";
import { commissionById, jobTypeOf } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { formatById, jobTypeById } from "@/lib/taxonomy";

import { categoryOf, orderStages, orderStatus, type Workspace } from "./helpers";
import { OrderNextStep, type Step } from "./next-step";

/**
 * The order's header card (Work spec 6.8.2): who it's with and what it is, the status chip, the
 * title, the five stage bars and the next-step box.
 */
export function OrderHeader({ ws, step }: { ws: Workspace; step: Step }) {
  const status = orderStatus(ws);
  const stages = orderStages(ws);
  return (
    <header data-tone="paper" className="y-block y-ord-card y-ord-head">
      <WhoLine ws={ws} chip={<StatusChip look={status.look}>{status.label}</StatusChip>} />
      <h1 className="y-display y-ord-title">{ws.commission.title}</h1>
      {stages ? (
        <StageBars stages={stages.stages} current={stages.current} label="Progress" className="y-ord-stages" />
      ) : null}
      <OrderNextStep step={step} />
    </header>
  );
}

/** "(avatar) Layla Mansour / You ordered · App demo · Fintech · Repeat" and the status chip. */
function WhoLine({ ws, chip }: { ws: Workspace; chip: React.ReactNode }) {
  const s = useDemo();
  const { commission: c, side, creator, business, slot, adCopy } = ws;
  const kind = slot ? "UGC campaign" : adCopy ? jobTypeById[jobTypeOf(c)].name : formatById[c.brief.format]?.name;
  const category = categoryOf(ws);
  const previous = c.previousCommissionId ? commissionById(s, c.previousCommissionId) : undefined;
  const total = slot?.terms ? slot.request?.slots : undefined;

  const source = slot ? (
    c.requestId ? (
      <Link href={paths.order(c.requestId)} className="y-ord-who-link">
        Slot {c.campaignSlot ?? ""}
        {total ? ` of ${total}` : ""}
      </Link>
    ) : (
      `Slot ${c.campaignSlot ?? ""}`
    )
  ) : c.previousCommissionId ? (
    <Link href={paths.commission(c.previousCommissionId)} className="y-ord-who-link" title={previous?.title}>
      Repeat order
    </Link>
  ) : c.source === "request" && c.requestId ? (
    <Link href={paths.order(c.requestId)} className="y-ord-who-link">
      From {side === "business" ? "your" : "a"} custom order
    </Link>
  ) : c.source === "direct" ? (
    "Direct order"
  ) : null;

  const name =
    side === "business" ? (
      creator ? (
        <Link href={paths.creator(creator.handle)} className="hover:underline">
          {creator.name}
        </Link>
      ) : (
        "The creator"
      )
    ) : (
      ws.businessName
    );

  return (
    <div className="y-ord-who">
      {side === "business" && creator ? <FaceAvatar id={creator.id} name="" size={44} /> : null}
      {side === "creator" && business ? <BusinessLogo business={business} size={44} /> : null}
      <span className="min-w-0">
        <b>{name}</b>
        <span className="y-ord-who-meta">
          {side === "business" ? "You ordered" : "You're making"}
          {kind ? ` · ${kind}` : ""}
          {category ? ` · ${category}` : ""}
          {source ? <> · {source}</> : null}
        </span>
      </span>
      <span className="y-ord-who-chip">{chip}</span>
    </div>
  );
}
