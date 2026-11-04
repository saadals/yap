"use client";

import {
  CheckCircle2,
  ChevronRight,
  Download,
  Mail,
  ReceiptText,
  ShieldCheck,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PriceSummary, paymentLabel } from "@/components/domain/money";
import { Badge } from "@/components/ui/badge";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { longDate, money, monthYearOf, shortDate } from "@/lib/format";
import type { receipts } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { countries } from "@/lib/taxonomy";
import type { PaymentStatus } from "@/lib/types";

import type { BillingDetails } from "./billing-details";
import { downloadFile, isoDay, toCsv } from "./kpi";

export type Receipt = ReturnType<typeof receipts>[number];
type ReceiptStatus = Exclude<PaymentStatus, "authorized">;

const statusInfo: Record<ReceiptStatus, { label: string; tone: "info" | "success" | "neutral"; icon: React.ReactNode }> = {
  held: { label: "Held", tone: "info", icon: <ShieldCheck size={14} aria-hidden /> },
  released: { label: "Paid", tone: "success", icon: <CheckCircle2 size={14} aria-hidden /> },
  refunded: { label: "Refunded", tone: "neutral", icon: <Undo2 size={14} aria-hidden /> },
};

export function ReceiptStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  const info = statusInfo[status === "authorized" ? "held" : status];
  return (
    <Badge tone={info.tone} icon={info.icon} className={className}>
      {info.label}
    </Badge>
  );
}

const monthKey = (iso: string) => isoDay(iso).slice(0, 7);

export function ReceiptsSection({ rows, details }: { rows: Receipt[]; details: BillingDetails }) {
  const toast = useToast();
  const [status, setStatus] = useState<ReceiptStatus | "all">("all");
  const [month, setMonth] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const months = [...new Set(rows.map((row) => monthKey(row.date)))];
  const shown = rows.filter(
    (row) => (status === "all" || row.status === status) && (month === "all" || monthKey(row.date) === month),
  );
  const open = rows.find((row) => row.id === openId) ?? null;
  const count = (value: ReceiptStatus) => rows.filter((row) => row.status === value).length;

  const exportCsv = () => {
    const header = ["Receipt", "Date", "Creator", "Commission", "Commission ID", "Status", "Amount (USD)", "Service fee (USD)", "Total (USD)"];
    const lines = shown.map((row) => [
      row.id,
      isoDay(row.date),
      row.creator?.name ?? "",
      row.commission.title,
      row.commission.id,
      statusInfo[row.status as ReceiptStatus]?.label ?? row.status,
      row.subtotal.toFixed(2),
      row.fee.toFixed(2),
      row.total.toFixed(2),
    ]);
    downloadFile(`yapp-receipts-${month === "all" ? "all" : month}${status === "all" ? "" : `-${status}`}.csv`, toCsv([header, ...lines]));
    toast({ message: `Exported ${shown.length} receipt${shown.length === 1 ? "" : "s"} as CSV` });
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No receipts yet"
        body="When a creator accepts your offer, the payment is held and a receipt appears here. You'll get another when you approve and it's released."
        shape="dome"
        tint="sun"
        face="calm"
        headingLevel={3}
        action={
          <PillButton href="/creators" variant="contrast" size="sm">
            Find a creator
          </PillButton>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="y-scroll-x -mx-5 flex gap-1.5 px-5 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Filter by status">
          <FilterChip pressed={status === "all"} onClick={() => setStatus("all")} count={rows.length} className="flex-none">
            All
          </FilterChip>
          {(Object.keys(statusInfo) as ReceiptStatus[]).map((value) => (
            <FilterChip
              key={value}
              pressed={status === value}
              onClick={() => setStatus(value)}
              count={count(value)}
              icon={statusInfo[value].icon}
              className="flex-none"
            >
              {statusInfo[value].label}
            </FilterChip>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="min-w-0 flex-1 lg:w-48 lg:flex-none">
            <span className="sr-only">Month</span>
            <select
              className="y-input !min-h-11"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            >
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
        {shown.length} receipt{shown.length === 1 ? "" : "s"} shown
      </p>

      {shown.length === 0 ? (
        <EmptyState
          title="No receipts match"
          body="Try another month or status."
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
              <caption className="sr-only">Receipts. Select a receipt number to see the itemised receipt.</caption>
              <thead>
                <tr className="y-micro y-fg-2 border-b border-(--b-line) text-start">
                  <th scope="col" className="py-3 pe-3 text-start font-medium">Receipt</th>
                  <th scope="col" className="py-3 pe-3 text-start font-medium">Date</th>
                  <th scope="col" className="py-3 pe-3 text-start font-medium">Creator</th>
                  <th scope="col" className="py-3 pe-3 text-start font-medium">Commission</th>
                  <th scope="col" className="py-3 pe-3 text-end font-medium">Amount</th>
                  <th scope="col" className="py-3 pe-3 text-end font-medium">Fee</th>
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
                      <span className="flex items-center gap-2">
                        {row.creator ? <FaceAvatar id={row.creator.id} name="" size={28} /> : null}
                        <span className="whitespace-nowrap">{row.creator?.name ?? "Creator"}</span>
                      </span>
                    </td>
                    <td className="max-w-[260px] py-3 pe-3">
                      <Link
                        href={`/business/commissions/${row.commission.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="y-link block truncate"
                      >
                        {row.commission.title}
                      </Link>
                    </td>
                    <td className="y-num py-3 pe-3 text-end">{money(row.subtotal, true)}</td>
                    <td className="y-num y-fg-2 py-3 pe-3 text-end">{money(row.fee, true)}</td>
                    <td className="y-num py-3 pe-3 text-end font-semibold">{money(row.total, true)}</td>
                    <td className="py-3">
                      <ReceiptStatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards */}
          <ul className="flex flex-col gap-2 md:hidden">
            {shown.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(row.id)}
                  className="y-tile y-hoverable flex w-full flex-col gap-3 p-4 text-start"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="y-small truncate font-semibold">{row.commission.title}</span>
                      <span className="y-micro y-fg-2 truncate">
                        {row.creator?.name ?? "Creator"} · {shortDate(row.date)}
                      </span>
                    </span>
                    <span className="y-display y-num flex-none text-xl font-semibold tracking-[-0.02em]">
                      {money(row.total)}
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <ReceiptStatusBadge status={row.status} />
                      <span className="y-micro y-fg-2 y-num">{row.id}</span>
                    </span>
                    <ChevronRight size={18} aria-hidden className="y-flip y-fg-2" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <ReceiptSheet receipt={open} details={details} onClose={() => setOpenId(null)} />
    </div>
  );
}

function ReceiptSheet({
  receipt,
  details,
  onClose,
}: {
  receipt: Receipt | null;
  details: BillingDetails;
  onClose: () => void;
}) {
  const s = useDemo();
  const toast = useToast();
  if (!receipt) return null;
  const c = receipt.commission;
  const method = s.paymentMethods.find((m) => m.id === c.payment.methodId);
  const refundedAt = c.events.find((e) => e.kind === "cancelled")?.at;
  const note =
    receipt.status === "held"
      ? "Held safely by Yapp. It's released to the creator only when you approve the final video, or automatically 3 days after delivery if you don't respond."
      : receipt.status === "released"
        ? `Released to ${receipt.creator?.firstName ?? "the creator"} when you approved the work${c.completedAt ? ` on ${longDate(c.completedAt)}` : ""}.`
        : `Refunded in full to ${method ? paymentLabel(method) : "your card"}${refundedAt ? ` on ${longDate(refundedAt)}` : ""}. No service fee was charged.`;

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Receipt ${receipt.id}`}
      description={`${longDate(receipt.date)} · ${c.title}`}
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
          <ReceiptStatusBadge status={receipt.status} />
          <span className="y-micro y-fg-2">{note}</span>
        </div>

        <div className="y-tile flex flex-col gap-3 p-4">
          <p className="y-micro y-fg-2 flex items-center gap-1.5">
            <ReceiptText size={14} aria-hidden /> Itemised
          </p>
          <PriceSummary
            price={c.price}
            addons={c.addons}
            feeRate={c.feeRate}
            perspective="business"
            showRights
          />
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="y-tile flex flex-col gap-1 p-4">
            <dt className="y-micro y-fg-2">Billed to</dt>
            <dd className="y-small flex flex-col">
              <span className="font-semibold">{details.companyName}</span>
              {details.vat ? <span className="y-num">VAT {details.vat}</span> : null}
              <span>{countries[details.country]?.name}</span>
              <span className="y-fg-2 break-all">{details.email}</span>
            </dd>
          </div>
          <div className="y-tile flex flex-col gap-1 p-4">
            <dt className="y-micro y-fg-2">Paid to</dt>
            <dd className="y-small flex flex-col">
              <span className="font-semibold">{receipt.creator?.name ?? "Creator"}</span>
              {receipt.creator ? <span className="y-fg-2">@{receipt.creator.handle}</span> : null}
              <span className="y-fg-2">Keeps 100% of {money(receipt.subtotal)}</span>
            </dd>
          </div>
          <div className="y-tile flex flex-col gap-1 p-4">
            <dt className="y-micro y-fg-2">Payment method</dt>
            <dd className="y-small font-semibold">{method ? paymentLabel(method) : "Card on file"}</dd>
          </div>
          <div className="y-tile flex flex-col gap-1 p-4">
            <dt className="y-micro y-fg-2">Commission</dt>
            <dd className="y-small">
              <Link href={`/business/commissions/${c.id}`} className="y-link font-semibold" onClick={onClose}>
                {c.title}
              </Link>
            </dd>
          </div>
        </dl>
      </div>
    </Sheet>
  );
}
