"use client";

import { Ban, ExternalLink, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { PitchBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { List } from "@/components/ui/list";
import { SectionLabel } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { creatorNet, money, shortDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { businessById, isAdCopy, requestById } from "@/lib/selectors";
import { actions, type DemoState, useDemo } from "@/lib/store";
import type { Commission, Pitch } from "@/lib/types";

import { ItemRow, RowMenu } from "./item-row";
import { PriceAndNet } from "./job-status";

/** Pitches the brand can still act on. */
const OPEN = new Set<Pitch["status"]>(["sent", "viewed", "shortlisted"]);

/** The job a hired pitch became. */
export function commissionForPitch(s: DemoState, pitch: Pitch): Commission | undefined {
  return (
    s.commissions.find((c) => c.pitchId === pitch.id) ??
    s.commissions.find((c) => c.requestId === pitch.requestId && c.creatorId === pitch.creatorId && c.source === "request")
  );
}

/** Waiting to hear back: the pitch is still in play and the order still takes pitches. */
export function isOpenPitch(s: DemoState, pitch: Pitch) {
  return OPEN.has(pitch.status) && requestById(s, pitch.requestId)?.status === "open";
}

/** Shortlisted first (closest to a hire), then newest. */
const openOrder = (a: Pitch, b: Pitch) =>
  Number(b.status === "shortlisted") - Number(a.status === "shortlisted") || Date.parse(b.sentAt) - Date.parse(a.sentAt);

/**
 * The Pitches tab: open pitches (with a menu to withdraw), then the ones that were decided. A
 * hired pitch links to its job; everything else to the order. Each shows your price (what the brand
 * sees) with what you'd earn after Yapp's 20%.
 */
export function PitchLists({ pitches }: { pitches: Pitch[] }) {
  const s = useDemo();
  const toast = useToast();
  const [withdrawing, setWithdrawing] = useState<Pitch | null>(null);
  const open = pitches.filter((p) => isOpenPitch(s, p)).sort(openOrder);
  const past = pitches.filter((p) => !isOpenPitch(s, p)).sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt));
  const target = withdrawing ? requestById(s, withdrawing.requestId) : undefined;
  const targetBrand = target ? businessById(s, target.businessId)?.name ?? "The brand" : "The brand";

  return (
    <>
      {open.length ? (
        <section aria-labelledby="pitches-open">
          <SectionLabel id="pitches-open" className="!pt-6">
            Waiting to hear back
          </SectionLabel>
          <List label="Pitches waiting to hear back">
            {open.map((pitch) => (
              <PitchRow key={pitch.id} pitch={pitch} onWithdraw={() => setWithdrawing(pitch)} />
            ))}
          </List>
        </section>
      ) : null}
      {past.length ? (
        <section aria-labelledby="pitches-past">
          <SectionLabel id="pitches-past" className={open.length ? "" : "!pt-6"}>
            Decided
          </SectionLabel>
          <List label="Decided pitches">
            {past.map((pitch) => (
              <PitchRow key={pitch.id} pitch={pitch} />
            ))}
          </List>
        </section>
      ) : null}

      <Sheet
        open={withdrawing !== null}
        onClose={() => setWithdrawing(null)}
        side="center"
        width="sm"
        title="Withdraw this pitch?"
        description={
          withdrawing && target
            ? `${targetBrand} will no longer see your ${money(withdrawing.price)} pitch for “${target.title}”.`
            : undefined
        }
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <PillButton variant="ghost" onClick={() => setWithdrawing(null)}>
              Keep my pitch
            </PillButton>
            <PillButton
              variant="contrast"
              icon={<Undo2 size={16} aria-hidden />}
              onClick={() => {
                if (!withdrawing) return;
                actions.withdrawPitch(withdrawing.id);
                setWithdrawing(null);
                toast({ message: "Pitch withdrawn. You can pitch again while the order is open." });
              }}
            >
              Withdraw pitch
            </PillButton>
          </div>
        }
      >
        <p className="y-small y-fg-2">
          {withdrawing?.status === "shortlisted"
            ? `You're on ${targetBrand}'s shortlist. Once you withdraw, they can't hire you from this pitch. You can still send a new one while the order is open.`
            : "This can't be undone, but you can send a new pitch as long as the order is open."}
        </p>
      </Sheet>
    </>
  );
}

function PitchRow({ pitch, onWithdraw }: { pitch: Pitch; onWithdraw?: () => void }) {
  const s = useDemo();
  const router = useRouter();
  const request = requestById(s, pitch.requestId);
  const business = request ? businessById(s, request.businessId) : undefined;
  const job = pitch.status === "hired" ? commissionForPitch(s, pitch) : undefined;
  const closedEarly = request && request.status !== "open" && OPEN.has(pitch.status);
  const href = job ? paths.job(job.id) : request ? paths.order(request.id) : undefined;
  const meta = [
    business?.name ?? "Order no longer available",
    request && isAdCopy(request) ? "Ad copy writing" : null,
    `Sent ${shortDate(pitch.sentAt)}`,
    job ? "Open the job" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const chip = closedEarly ? (
    <Badge tone="danger" icon={<Ban size={14} aria-hidden />}>
      Order closed
    </Badge>
  ) : (
    <PitchBadge status={pitch.status} />
  );

  return (
    <ItemRow
      href={href}
      lead={business ? <BusinessLogo business={business} size={40} /> : null}
      title={request?.title ?? "Order no longer available"}
      meta={meta}
      chip={chip}
      amount={
        // A pitch still in play (or hired) shows what you'd earn; one that ended shows the price you named.
        (OPEN.has(pitch.status) && !closedEarly) || pitch.status === "hired" ? (
          <PriceAndNet price={pitch.price} net={creatorNet(pitch.price)} />
        ) : (
          <span className="y-fg-2 font-normal">{money(pitch.price)}</span>
        )
      }
      menu={
        onWithdraw && request ? (
          <RowMenu
            label={`More for your pitch on ${request.title}`}
            items={[
              { label: "View the order", icon: <ExternalLink size={16} />, onSelect: () => router.push(paths.order(request.id)) },
              { label: "Withdraw pitch", icon: <Undo2 size={16} />, tone: "danger", onSelect: onWithdraw },
            ]}
          />
        ) : undefined
      }
    />
  );
}
