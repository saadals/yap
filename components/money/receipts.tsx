"use client";

import {
  ArrowUpCircle,
  CheckCircle2,
  ChevronRight,
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

import { PriceSummary, paymentLabel } from "@/components/domain/money";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { creatorNet, longDate, money, moneyExact, monthYearOf, plural, shortDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { campaignReceipts, me, receipts } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { useDemo } from "@/lib/store";
import { CAMPAIGN_FEE_RATE, FEE_PCT, countries } from "@/lib/taxonomy";
import type { LedgerEntry, PaymentStatus } from "@/lib/types";

import type { BillingDetails } from "./billing-details";
import { downloadFile, isoDay, toCsv } from "./kpi";

/* -------------------------------------------------------------------------- */
/* Rows: one per order with money movement, one per campaign ledger line       */
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

type ReceiptStatus = Exclude<PaymentStatus, "authorized">;
type StatusInfo = { label: string; tone: BadgeTone; icon: React.ReactNode };

const statusInfo: Record<ReceiptStatus, StatusInfo> = {
  held: { label: "Held", tone: "active", icon: <ShieldCheck size={14} aria-hidden /> },
  released: { label: "Paid", tone: "success", icon: <CheckCircle2 size={14} aria-hidden /> },
  refunded: { label: "Refunded", tone: "danger", icon: <Undo2 size={14} aria-hidden /> },
  // Campaign slots only (receipts show the campaign's ledger instead); kept for completeness.
  pending: { label: "Pending", tone: "warning", icon: <Clock size={14} aria-hidden /> },
  returned: { label: "Returned", tone: "danger", icon: <RotateCcw size={14} aria-hidden /> },
};

/** Campaign ledger lines: `label` names the line, the badge says what happened. */
const ledgerInfo: Record<LedgerEntry["kind"], StatusInfo & { line: string }> = {
  charge: { line: "Campaign budget held", label: "Held", tone: "active", icon: <ShieldCheck size={14} aria-hidden /> },
  top_up: { line: "Price raise top-up", label: "Top-up", tone: "active", icon: <ArrowUpCircle size={14} aria-hidden /> },
  refund: { line: "Refund", label: "Refunded", tone: "danger", icon: <Undo2 size={14} aria-hidden /> },
};

const statusOf = (row: Receipt): StatusInfo =>
  row.kind === "order" ? statusInfo[row.status as ReceiptStatus] ?? statusInfo.held : ledgerInfo[row.entry.kind];
const titleOf = (row: Receipt) => (row.kind === "order" ? row.commission.title : row.request.title);
const hrefOf = (row: Receipt) => (row.kind === "order" ? paths.commission(row.commission.id) : paths.order(row.request.id));
const totalOf = (row: Receipt) => (row.kind === "order" ? row.total : row.amount);
/** "−$60.00" for refunds. */
const signed = (amount: number, cents = true) => (amount < 0 ? `−${money(-amount, cents)}` : money(amount, cents));

export function ReceiptStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  const info = statusInfo[status === "authorized" ? "held" : status];
  return (
    <Badge tone={info.tone} icon={info.icon} className={className}>
      {info.label}
    </Badge>
  );
}

function RowBadge({ row, className }: { row: Receipt; className?: string }) {
  const info = statusOf(row);
  return (
    <Badge tone={info.tone} icon={info.icon} className={className}>
      {info.label}
    </Badge>
  );
}

/** Who the money is for: the creator on an order, the campaign's creators on a campaign. */
function Party({ row }: { row: Receipt }) {
  if (row.kind === "campaign") {
    return (
      <span className="flex items-center gap-2">
        <span aria-hidden className="grid size-7 flex-none place-items-center rounded-full bg-(--b-chip)">
          <Megaphone size={14} />
        </span>
        <span className="whitespace-nowrap">UGC campaign</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2">
      {row.creator ? <FaceAvatar id={row.creator.id} name="" size={28} /> : null}
      <span className="whitespace-nowrap">{row.creator?.name ?? "Creator"}</span>
    </span>
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

/** A campaign line's status: the budget and top-ups are held, a refund is refunded. */
const campaignStatus = (row: Extract<Receipt, { kind: "campaign" }>): Filter =>
  row.entry.kind === "refund" ? "refunded" : "held";

/** Status filters match every line with that badge; "Campaigns" shows every campaign ledger line. */
const matches = (row: Receipt, filter: Filter | "all") =>
  filter === "all" ||
  (filter === "campaign"
    ? row.kind === "campaign"
    : (row.kind === "order" ? row.status : campaignStatus(row)) === filter);

const monthKey = (iso: string) => isoDay(iso).slice(0, 7);

export function ReceiptsSection({ rows, details }: { rows: Receipt[]; details: BillingDetails }) {
  const toast = useToast();
  const [status, setStatus] = useState<Filter | "all">("all");
  const [month, setMonth] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const months = [...new Set(rows.map((row) => monthKey(row.date)))];
  const shown = rows.filter((row) => matches(row, status) && (month === "all" || monthKey(row.date) === month));
  const open = rows.find((row) => row.id === openId) ?? null;
  const count = (value: Filter) => rows.filter((row) => matches(row, value)).length;
  // Only offer filters that have something behind them (plus whichever is selected).
  const visibleFilters = filters.filter((f) => count(f.value) > 0 || f.value === status);

  const exportCsv = () => {
    const header = [
      "Receipt",
      "Date",
      "Type",
      "Paid to",
      "Order",
      "Order ID",
      "Status",
      "Total (USD)",
    ];
    const lines = shown.map((row) =>
      row.kind === "order"
        ? [
            row.id,
            isoDay(row.date),
            "Order",
            row.creator?.name ?? "",
            row.commission.title,
            row.commission.id,
            statusOf(row).label,
            row.total.toFixed(2),
          ]
        : [
            row.id,
            isoDay(row.date),
            "UGC campaign",
            "Campaign creators",
            row.request.title,
            row.request.id,
            ledgerInfo[row.entry.kind].line,
            row.amount.toFixed(2),
          ],
    );
    downloadFile(
      `yapp-receipts-${month === "all" ? "all" : month}${status === "all" ? "" : `-${status}`}.csv`,
      toCsv([header, ...lines]),
    );
    toast({ message: `Exported ${plural(shown.length, "receipt")} as CSV` });
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No receipts yet"
        body="When a creator accepts your order or you launch a campaign, the payment is held and a receipt appears here. You'll get another when it's released."
        shape="dome"
        tint="sun"
        face="calm"
        headingLevel={3}
        action={
          <PillButton href={paths.explore("creators")} variant="contrast" size="sm">
            Find a creator
          </PillButton>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="y-scroll-x -mx-5 flex gap-1.5 px-5 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Filter receipts">
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
        <div className="flex items-center gap-2">
          <label className="min-w-0 flex-1 lg:w-48 lg:flex-none">
            <span className="sr-only">Month</span>
            <select className="y-input !min-h-11" value={month} onChange={(event) => setMonth(event.target.value)}>
              <option value="all">All months</option>
              {months.map((key) => (
                <option key={key} value={key}>
                  {monthYearOf(`${key}-15T12:00:00Z`)}
                </option>
              ))}
            </select>
          </label>
          <PillButton
            variant="outline"
            size="sm"
            icon={<Download size={16} aria-hidden />}
            onClick={exportCsv}
            disabled={shown.length === 0}
            className="flex-none !min-h-11"
          >
            Export CSV
          </PillButton>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {plural(shown.length, "receipt")} shown
      </p>

      {shown.length === 0 ? (
        <EmptyState
          title="No receipts match"
          body="Try another month or filter."
          shape="ball"
          tint="sea"
          headingLevel={3}
          action={
            <PillButton
              variant="soft"
              size="sm"
              onClick={() => {
                setStatus("all");
                setMonth("all");
              }}
            >
              Show all receipts
            </PillButton>
          }
        />
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-start">
              <caption className="sr-only">Receipts. Select a receipt number to see the itemized receipt.</caption>
              <thead>
                <tr className="y-eyebrow border-b border-(--b-line) text-start">
                  <th scope="col" className="py-3 pe-3 text-start font-medium">Receipt</th>
                  <th scope="col" className="py-3 pe-3 text-start font-medium">Date</th>
                  <th scope="col" className="py-3 pe-3 text-start font-medium">Paid to</th>
                  <th scope="col" className="py-3 pe-3 text-start font-medium">Order</th>
                  <th scope="col" className="py-3 pe-3 text-end font-medium">Total</th>
                  <th scope="col" className="py-3 text-start font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setOpenId(row.id)}
                    className="y-small cursor-pointer border-b border-(--b-line) transition-colors last:border-0 hover:bg-(--b-chip)"
                  >
                    <td className="py-3 pe-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenId(row.id);
                        }}
                        className="y-link y-num font-semibold whitespace-nowrap"
                      >
                        {row.id}
                      </button>
                    </td>
                    <td className="y-num py-3 pe-3 whitespace-nowrap">{shortDate(row.date)}</td>
                    <td className="py-3 pe-3">
                      <Party row={row} />
                    </td>
                    <td className="max-w-[360px] py-3 pe-3">
                      <Link
                        href={hrefOf(row)}
                        onClick={(event) => event.stopPropagation()}
                        className="y-link block truncate"
                      >
                        {titleOf(row)}
                      </Link>
                      {row.kind === "campaign" ? (
                        <span className="y-micro y-fg-2 block truncate">{ledgerInfo[row.entry.kind].line}</span>
                      ) : null}
                    </td>
                    <td className="y-num py-3 pe-3 text-end font-semibold whitespace-nowrap">{signed(totalOf(row))}</td>
                    <td className="py-3">
                      <RowBadge row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: compact rows */}
          <ul className="flex flex-col divide-y divide-(--b-line) md:hidden">
            {shown.map((row) => (
              <li key={row.id}>
                <button type="button" onClick={() => setOpenId(row.id)} className="flex w-full items-center gap-3 py-3 text-start">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="y-small truncate font-semibold">{titleOf(row)}</span>
                    <span className="y-micro y-fg-2 truncate">
                      {row.kind === "order"
                        ? `${row.creator?.name ?? "Creator"} · ${shortDate(row.date)} · ${statusOf(row).label}`
                        : `${ledgerInfo[row.entry.kind].line} · ${shortDate(row.date)}`}
                    </span>
                  </span>
                  <span className="y-small y-num flex-none font-semibold">{signed(totalOf(row), false)}</span>
                  <ChevronRight size={16} aria-hidden className="y-flip y-fg-3 flex-none" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

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
            icon={<Mail size={18} aria-hidden />}
            onClick={() => toast({ message: `Receipt ${receipt.id} sent to ${details.email}` })}
          >
            Email receipt
          </PillButton>
          <PillButton
            variant="soft"
            icon={<Download size={18} aria-hidden />}
            onClick={() =>
              toast({
                message: "PDF downloads aren't part of this prototype. Email the receipt or export CSV instead.",
                tone: "info",
              })
            }
          >
            Download PDF
          </PillButton>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <RowBadge row={receipt} />
          <span className="y-micro y-fg-2">{note}</span>
        </div>
        {children}
      </div>
    </Sheet>
  );
}

function BilledTo({ details }: { details: BillingDetails }) {
  return (
    <div className="y-tile flex flex-col gap-1 p-4">
      <dt className="y-micro y-fg-2">Billed to</dt>
      <dd className="y-small flex flex-col">
        <span className="font-semibold">{details.companyName}</span>
        {details.vat ? <span className="y-num">Tax ID {details.vat}</span> : null}
        <span>{countries[details.country]?.name}</span>
        <span className="y-fg-2 break-all">{details.email}</span>
      </dd>
    </div>
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
      ? "Held safely by Yapp. It's released to the creator only when you approve the final video, or automatically 3 days after delivery if you don't respond."
      : receipt.status === "released"
        ? `Released to ${receipt.creator?.firstName ?? "the creator"} when you approved the work${c.completedAt ? ` on ${longDate(c.completedAt)}` : ""}.`
        : `Refunded in full to ${method ? paymentLabel(method) : "your card"}${refundedAt ? ` on ${longDate(refundedAt)}` : ""}.`;
  const name = receipt.creator?.firstName ?? "The creator";
  const net = moneyExact(receipt.creatorEarns);
  const creatorLine =
    receipt.status === "released"
      ? `Received ${net} after the ${FEE_PCT}% Yapp fee`
      : receipt.status === "held"
        ? `${name} receives ${net} on approval, after the ${FEE_PCT}% Yapp fee`
        : "Not paid: the money came back to you";

  return (
    <SheetFrame
      receipt={receipt}
      details={details}
      description={`${longDate(receipt.date)} · ${c.title}`}
      note={note}
      onClose={onClose}
    >
      <div className="y-tile flex flex-col gap-3 p-4">
        <p className="y-micro y-fg-2 flex items-center gap-1.5">
          <ReceiptText size={14} aria-hidden /> Itemized
        </p>
        <PriceSummary
          price={c.price}
          addons={c.addons}
          feeRate={c.feeRate}
          perspective="business"
          usage={c.brief.usage}
          cents
        />
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BilledTo details={details} />
        <div className="y-tile flex flex-col gap-1 p-4">
          <dt className="y-micro y-fg-2">Paid to</dt>
          <dd className="y-small flex flex-col">
            <span className="font-semibold">{receipt.creator?.name ?? "Creator"}</span>
            {receipt.creator ? <span className="y-fg-2">@{receipt.creator.handle}</span> : null}
            <span className="y-fg-2">{creatorLine}</span>
          </dd>
        </div>
        <div className="y-tile flex flex-col gap-1 p-4">
          <dt className="y-micro y-fg-2">Payment method</dt>
          <dd className="y-small font-semibold">{method ? paymentLabel(method) : "Card on file"}</dd>
        </div>
        <div className="y-tile flex flex-col gap-1 p-4">
          <dt className="y-micro y-fg-2">Commission</dt>
          <dd className="y-small">
            <Link href={paths.commission(c.id)} className="y-link font-semibold" onClick={onClose}>
              {c.title}
            </Link>
          </dd>
        </div>
      </dl>
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
      ? "Charged when you posted the campaign and held by Yapp. Each slot is paid out after you approve its video. Unpicked slots are refunded when the campaign closes."
      : entry.kind === "top_up"
        ? "Extra held after you raised the price for open slots. Slots already taken keep their price."
        : `Refunded to ${card} in full.`;
  const row = "flex items-baseline justify-between gap-3";

  return (
    <SheetFrame
      receipt={receipt}
      details={details}
      description={`${longDate(receipt.date)} · ${request.title}`}
      note={note}
      onClose={onClose}
    >
      <div className="y-tile flex flex-col gap-3 p-4">
        <p className="y-micro y-fg-2 flex items-center gap-1.5">
          <ReceiptText size={14} aria-hidden /> Itemized
        </p>
        <dl className="flex flex-col gap-2">
          <div className={row}>
            <dt className="y-small">{ledgerInfo[entry.kind].line}</dt>
            <dd className="y-small y-num font-semibold">{signed(receipt.amount)}</dd>
          </div>
          <div className={row}>
            <dt className="y-small y-fg-2">{entry.note}</dt>
          </div>
          <div className={`${row} border-t border-(--b-line) pt-2`}>
            <dt className="y-small font-semibold">Total</dt>
            <dd className="y-head y-num">{signed(receipt.amount)}</dd>
          </div>
        </dl>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BilledTo details={details} />
        <div className="y-tile flex flex-col gap-1 p-4">
          <dt className="y-micro y-fg-2">Paid to</dt>
          <dd className="y-small flex flex-col">
            <span className="font-semibold">The campaign&apos;s creators</span>
            <span className="y-fg-2">
              {money(request.campaign.pricePerVideo)} per approved video. Each creator receives{" "}
              {moneyExact(creatorNet(request.campaign.pricePerVideo, CAMPAIGN_FEE_RATE))} after the {FEE_PCT}% Yapp fee
            </span>
          </dd>
        </div>
        <div className="y-tile flex flex-col gap-1 p-4">
          <dt className="y-micro y-fg-2">Payment method</dt>
          <dd className="y-small font-semibold">{method ? paymentLabel(method) : "Card on file"}</dd>
        </div>
        <div className="y-tile flex flex-col gap-1 p-4">
          <dt className="y-micro y-fg-2">Campaign</dt>
          <dd className="y-small">
            <Link href={paths.order(request.id)} className="y-link font-semibold" onClick={onClose}>
              {request.title}
            </Link>
          </dd>
        </div>
      </dl>
    </SheetFrame>
  );
}
