"use client";

import {
  ArrowUpCircle,
  CheckCircle2,
  Clock,
  Download,
  Mail,
  Megaphone,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { IconTile } from "@/components/brand-home/order-row";
import { PriceSummary, paymentLabel } from "@/components/domain/money";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { KeyValues } from "@/components/ui/progress";
import { List, Row } from "@/components/ui/list";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { creatorNet, longDate, money, moneyExact, plural, shortDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { campaignReceipts, me, receipts } from "@/lib/selectors";
import { type DemoState, useDemo } from "@/lib/store";
import { AUTO_APPROVE_DAYS, CAMPAIGN_FEE_RATE, CAMPAIGN_RELEASE_DAYS, FEE_PCT, countries } from "@/lib/taxonomy";
import type { LedgerEntry, PaymentStatus } from "@/lib/types";

import type { BillingDetails } from "./billing-details";
import { downloadFile, isoDay, toCsv } from "./csv";

/* -------------------------------------------------------------------------- */
/* Lines: one per order with money movement, one per campaign ledger entry     */
/* -------------------------------------------------------------------------- */

type OrderLine = ReturnType<typeof receipts>[number];
type CampaignLine = ReturnType<typeof campaignReceipts>[number];
export type Receipt = ({ kind: "order" } & OrderLine) | ({ kind: "campaign" } & CampaignLine);

/** Every receipt line of the signed-in account's buyer profile, newest first. */
export function allReceipts(s: DemoState): Receipt[] {
  return [
    ...receipts(s).map((row) => ({ kind: "order" as const, ...row })),
    ...campaignReceipts(s).map((row) => ({ kind: "campaign" as const, ...row })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

type StatusInfo = { label: string; tone: BadgeTone; icon: React.ReactNode };

const statusInfo: Record<Exclude<PaymentStatus, "authorized">, StatusInfo> = {
  held: { label: "Held", tone: "active", icon: <ShieldCheck size={14} aria-hidden /> },
  released: { label: "Paid", tone: "success", icon: <CheckCircle2 size={14} aria-hidden /> },
  refunded: { label: "Refunded", tone: "danger", icon: <Undo2 size={14} aria-hidden /> },
  // Campaign slots only (receipts show the campaign's ledger instead); kept for completeness.
  pending: { label: "Pending", tone: "neutral", icon: <Clock size={14} aria-hidden /> },
  returned: { label: "Returned", tone: "danger", icon: <RotateCcw size={14} aria-hidden /> },
};

/** Campaign ledger lines: `line` names the line, the badge says what happened. */
const ledgerInfo: Record<LedgerEntry["kind"], StatusInfo & { line: string }> = {
  charge: { line: "Campaign budget held", label: "Held", tone: "active", icon: <ShieldCheck size={14} aria-hidden /> },
  top_up: { line: "Price change top-up", label: "Top-up", tone: "active", icon: <ArrowUpCircle size={14} aria-hidden /> },
  refund: { line: "Refund", label: "Refunded", tone: "danger", icon: <Undo2 size={14} aria-hidden /> },
};

const statusOf = (row: Receipt): StatusInfo =>
  row.kind === "order"
    ? (statusInfo[row.status as Exclude<PaymentStatus, "authorized">] ?? statusInfo.held)
    : ledgerInfo[row.entry.kind];
const titleOf = (row: Receipt) => (row.kind === "order" ? row.commission.title : row.request.title);
const totalOf = (row: Receipt) => (row.kind === "order" ? row.total : row.amount);
/** "−$60.00" for refunds. */
const signed = (amount: number, cents = true) => (amount < 0 ? `−${money(-amount, cents)}` : money(amount, cents));

function RowBadge({ row }: { row: Receipt }) {
  const info = statusOf(row);
  return (
    <Badge tone={info.tone} icon={info.icon}>
      {info.label}
    </Badge>
  );
}

/* -------------------------------------------------------------------------- */
/* List                                                                        */
/* -------------------------------------------------------------------------- */

type Filter = "held" | "released" | "refunded" | "campaign";
const filters: { value: Filter; label: string }[] = [
  { value: "held", label: "Held" },
  { value: "released", label: "Paid" },
  { value: "refunded", label: "Refunded" },
  { value: "campaign", label: "Campaigns" },
];

const matches = (row: Receipt, filter: Filter | "all") =>
  filter === "all" ||
  (filter === "campaign"
    ? row.kind === "campaign"
    : (row.kind === "order" ? row.status : row.entry.kind === "refund" ? "refunded" : "held") === filter);

/**
 * Receipts as rows: what it was for, who was paid and when, the amount and its status. A row opens
 * the itemized receipt (email it, or export the list as CSV).
 */
export function Receipts({ rows, details }: { rows: Receipt[]; details: BillingDetails }) {
  const toast = useToast();
  const [status, setStatus] = useState<Filter | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const shown = rows.filter((row) => matches(row, status));
  const open = rows.find((row) => row.id === openId) ?? null;
  const count = (value: Filter) => rows.filter((row) => matches(row, value)).length;
  const visibleFilters = filters.filter((f) => count(f.value) > 0 || f.value === status);

  const exportCsv = () => {
    // Listed prices only: what moved on your card. Nothing is added on top of a price.
    const header = ["Receipt", "Date", "Type", "Paid to", "Order", "Order ID", "Status", "Total (USD)"];
    const lines = shown.map((row) =>
      row.kind === "order"
        ? [row.id, isoDay(row.date), row.commission.source === "request" ? "Custom order" : "Direct order", row.creator?.name ?? "", row.commission.title, row.commission.id, statusOf(row).label, row.total.toFixed(2)]
        : [row.id, isoDay(row.date), "UGC campaign", "Campaign creators", row.request.title, row.request.id, ledgerInfo[row.entry.kind].line, row.amount.toFixed(2)],
    );
    downloadFile(`yapp-receipts${status === "all" ? "" : `-${status}`}.csv`, toCsv([header, ...lines]));
    toast({ message: `Exported ${plural(shown.length, "receipt")} as CSV` });
  };

  if (rows.length === 0) {
    return (
      <Block tone="paper" pad="md">
        <EmptyState
          title="No receipts yet"
          body="When a creator accepts your order or you post a campaign, the payment is held and a receipt appears here. You get another when it's released."
          icon={<ReceiptText size={22} aria-hidden />}
          headingLevel={3}
          action={
            <PillButton href={paths.discover()} variant="contrast" size="sm">
              Find a creator
            </PillButton>
          }
        />
      </Block>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div role="group" aria-label="Filter receipts" className="y-scroll-x -mx-(--y-gutter) flex gap-1.5 px-(--y-gutter) md:mx-0 md:px-0">
          <FilterChip pressed={status === "all"} onClick={() => setStatus("all")} count={rows.length} className="flex-none">
            All
          </FilterChip>
          {visibleFilters.map((filter) => (
            <FilterChip
              key={filter.value}
              pressed={status === filter.value}
              onClick={() => setStatus(filter.value)}
              count={count(filter.value)}
              className="flex-none"
            >
              {filter.label}
            </FilterChip>
          ))}
        </div>
        <PillButton
          variant="ghost"
          size="sm"
          icon={<Download size={16} aria-hidden />}
          onClick={exportCsv}
          disabled={shown.length === 0}
          className="flex-none max-md:hidden"
        >
          Export CSV
        </PillButton>
      </div>

      <p className="sr-only" aria-live="polite">
        {plural(shown.length, "receipt")} shown
      </p>

      <List label="Receipts">
        {shown.map((row) => (
          <Row
            key={row.id}
            onClick={() => setOpenId(row.id)}
            ariaLabel={`${titleOf(row)}, ${signed(totalOf(row))}, ${statusOf(row).label}. Open receipt ${row.id}`}
            lead={
              row.kind === "order" ? (
                <FaceAvatar id={row.commission.creatorId} name={row.creator?.name ?? ""} size={40} />
              ) : (
                <IconTile>
                  <Megaphone size={18} />
                </IconTile>
              )
            }
            title={titleOf(row)}
            meta={`${shortDate(row.date)} · ${row.kind === "order" ? (row.creator?.name ?? "Creator") : ledgerInfo[row.entry.kind].line}`}
            end={
              <span className="flex flex-col items-end gap-1">
                <span className="y-small y-num font-medium whitespace-nowrap">{signed(totalOf(row))}</span>
                <RowBadge row={row} />
              </span>
            }
            chevron={false}
          />
        ))}
      </List>

      {open?.kind === "order" ? (
        <OrderReceiptSheet receipt={open} details={details} onClose={() => setOpenId(null)} />
      ) : open?.kind === "campaign" ? (
        <CampaignReceiptSheet receipt={open} details={details} onClose={() => setOpenId(null)} />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Receipt sheets                                                              */
/* -------------------------------------------------------------------------- */

function SheetFrame({
  receipt,
  details,
  description,
  note,
  onClose,
  children,
}: {
  receipt: Receipt;
  details: BillingDetails;
  description: string;
  note: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const toast = useToast();
  return (
    <Sheet
      open
      onClose={onClose}
      title={`Receipt ${receipt.id}`}
      description={description}
      footer={
        <div className="flex flex-wrap gap-2">
          <PillButton
            variant="contrast"
            icon={<Mail size={17} aria-hidden />}
            onClick={() => toast({ message: `Receipt ${receipt.id} sent to ${details.email}` })}
          >
            Email receipt
          </PillButton>
          <PillButton
            variant="ghost"
            icon={<Download size={17} aria-hidden />}
            onClick={() => toast({ message: "PDFs aren't part of this prototype. Email the receipt or export CSV instead.", tone: "info" })}
          >
            Download PDF
          </PillButton>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-start gap-2">
          <RowBadge row={receipt} />
          <p className="y-small y-fg-2">{note}</p>
        </div>
        {children}
      </div>
    </Sheet>
  );
}

function BilledTo({ details }: { details: BillingDetails }) {
  return (
    <span className="flex flex-col items-end">
      <span>{details.companyName}</span>
      {details.vat ? <span className="y-fg-2 y-num font-normal">Tax ID {details.vat}</span> : null}
      <span className="y-fg-2 font-normal">{countries[details.country]?.name}</span>
    </span>
  );
}

function OrderReceiptSheet({
  receipt,
  details,
  onClose,
}: {
  receipt: Extract<Receipt, { kind: "order" }>;
  details: BillingDetails;
  onClose: () => void;
}) {
  const s = useDemo();
  const c = receipt.commission;
  const method = me.paymentMethods(s).find((m) => m.id === c.payment.methodId);
  const refundedAt = c.events.find((e) => e.kind === "cancelled")?.at;
  const note =
    receipt.status === "held"
      ? `Held safely by Yapp. It's released to the creator only when you approve the work, or by itself ${AUTO_APPROVE_DAYS} days after a delivery if you don't respond.`
      : receipt.status === "released"
        ? `Released to ${receipt.creator?.firstName ?? "the creator"} when you approved the work${c.completedAt ? ` on ${longDate(c.completedAt)}` : ""}.`
        : `Refunded in full to ${method ? paymentLabel(method) : "your card"}${refundedAt ? ` on ${longDate(refundedAt)}` : ""}: the price you paid, all of it.`;
  const first = receipt.creator?.firstName ?? "The creator";
  const net = moneyExact(receipt.creatorEarns);
  const creatorLine =
    receipt.status === "released"
      ? `Received ${net} after Yapp's ${FEE_PCT}%`
      : receipt.status === "held"
        ? `${first} receives ${net} on approval, after Yapp's ${FEE_PCT}%`
        : "Not paid: the money came back to you";

  return (
    <SheetFrame receipt={receipt} details={details} description={`${longDate(receipt.date)} · ${c.title}`} note={note} onClose={onClose}>
      <div className="y-tile p-4">
        <PriceSummary price={c.price} addons={c.addons} feeRate={c.feeRate} perspective="business" usage={c.brief.usage} cents />
      </div>
      <KeyValues
        rows={[
          { label: "Billed to", value: <BilledTo details={details} /> },
          {
            label: "Paid to",
            value: (
              <span className="flex flex-col items-end">
                <span>{receipt.creator?.name ?? "Creator"}</span>
                <span className="y-fg-2 font-normal">{creatorLine}</span>
              </span>
            ),
          },
          { label: "Payment method", value: method ? paymentLabel(method) : "Card on file" },
          {
            label: "Job",
            value: (
              <Link href={paths.job(c.id)} className="y-link" onClick={onClose}>
                {c.title}
              </Link>
            ),
          },
        ]}
      />
    </SheetFrame>
  );
}

function CampaignReceiptSheet({
  receipt,
  details,
  onClose,
}: {
  receipt: Extract<Receipt, { kind: "campaign" }>;
  details: BillingDetails;
  onClose: () => void;
}) {
  const s = useDemo();
  const { request, entry } = receipt;
  const method = me.paymentMethods(s).find((m) => m.id === request.campaign.paymentMethodId);
  const card = method ? paymentLabel(method) : "your card";
  const note =
    entry.kind === "charge"
      ? `Charged when you posted the campaign and held by Yapp. Each creator is paid ${CAMPAIGN_RELEASE_DAYS} days after their post is verified; slots nobody picks are refunded in full when the campaign closes.`
      : entry.kind === "top_up"
        ? "Extra held after you raised the price for open slots. Slots already picked keep their price."
        : `Refunded to ${card} in full.`;
  const row = "flex items-baseline justify-between gap-3";

  return (
    <SheetFrame receipt={receipt} details={details} description={`${longDate(receipt.date)} · ${request.title}`} note={note} onClose={onClose}>
      <dl className="y-tile flex flex-col gap-2.5 p-4">
        <div className={row}>
          <dt className="y-small">{ledgerInfo[entry.kind].line}</dt>
          <dd className="y-small y-num font-medium">{signed(receipt.amount)}</dd>
        </div>
        <div className={row}>
          <dt className="y-small y-fg-2">{entry.note}</dt>
        </div>
        <div className={`${row} border-t border-(--b-line) pt-2.5`}>
          <dt className="y-head">
            Total
            <span className="y-micro y-fg-2 block font-normal">Nothing is added on top</span>
          </dt>
          <dd className="y-display y-num text-[28px] leading-none">{signed(receipt.amount)}</dd>
        </div>
      </dl>
      <KeyValues
        rows={[
          { label: "Billed to", value: <BilledTo details={details} /> },
          {
            label: "Paid to",
            value: (
              <span className="flex flex-col items-end">
                <span>The campaign&apos;s creators</span>
                <span className="y-fg-2 font-normal">
                  {money(request.campaign.pricePerVideo)} a Yapp. Each creator receives{" "}
                  {moneyExact(creatorNet(request.campaign.pricePerVideo, CAMPAIGN_FEE_RATE))} after Yapp&apos;s {FEE_PCT}%
                </span>
              </span>
            ),
          },
          { label: "Payment method", value: method ? paymentLabel(method) : "Card on file" },
          {
            label: "Campaign",
            value: (
              <Link href={paths.order(request.id)} className="y-link" onClick={onClose}>
                {request.title}
              </Link>
            ),
          },
        ]}
      />
    </SheetFrame>
  );
}
