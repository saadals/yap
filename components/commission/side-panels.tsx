"use client";

import {
  Ban,
  BadgeCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Flag,
  LifeBuoy,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { BusinessLogo } from "@/components/domain/business-logo";
import { PriceSummary, ProtectedNote, paymentLabel } from "@/components/domain/money";
import { Rating } from "@/components/domain/stars";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { shortDate, timeOf, weekdayDate } from "@/lib/format";
import { cityLabel, me } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import type { PaymentStatus } from "@/lib/types";

import { autoApproveDate, cash, type Workspace } from "./helpers";

export function SidePanels({ ws }: { ws: Workspace }) {
  return (
    <>
      <People ws={ws} />
      <Money ws={ws} />
      <Dates ws={ws} />
      <Help ws={ws} />
    </>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="y-tile flex flex-col gap-0.5 px-3 py-2.5">
      <dt className="y-micro y-fg-2">{label}</dt>
      <dd className="y-small font-semibold">{children}</dd>
    </div>
  );
}

function People({ ws }: { ws: Workspace }) {
  const s = useDemo();
  const { role, creator, business } = ws;
  const member = role === "business" ? me.member(s) : undefined;

  const creatorRow = creator ? (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <FaceAvatar id={creator.id} name="" size={48} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="y-micro y-fg-2">{role === "business" ? "Creator" : "You"}</span>
          {role === "business" ? (
            <Link href={`/creators/${creator.handle}`} className="y-small y-link w-fit font-semibold">
              {creator.name}
            </Link>
          ) : (
            <span className="y-small font-semibold">{creator.name}</span>
          )}
          <span className="y-micro y-fg-2 truncate">
            @{creator.handle} · {cityLabel(creator.cityId)}
          </span>
        </div>
        {creator.verified ? (
          <BadgeCheck size={20} aria-label="Verified creator" className="flex-none" />
        ) : null}
      </div>
      {role === "business" ? (
        <dl className="grid grid-cols-3 gap-1.5">
          <Stat label="Rating">
            <Rating value={creator.rating} />
          </Stat>
          <Stat label="On time">
            <span className="y-num">{creator.onTimeRate}%</span>
          </Stat>
          <Stat label="Replies in">
            <span className="y-num">~{creator.responseHours}h</span>
          </Stat>
        </dl>
      ) : null}
    </div>
  ) : null;

  const businessRow = business ? (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <BusinessLogo business={business} size={48} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="y-micro y-fg-2">{role === "creator" ? "Client" : "Your team"}</span>
          <span className="y-small font-semibold">{business.name}</span>
          <span className="y-micro y-fg-2 truncate">
            {role === "business" && member ? `${member.name} · ${member.title}` : cityLabel(business.cityId)}
          </span>
        </div>
      </div>
      {role === "creator" ? (
        <>
          <dl className="grid grid-cols-2 gap-1.5">
            <Stat label="Hires on Yapp">
              <span className="y-num">{business.hires}</span>
            </Stat>
            <Stat label="Client rating">
              <Rating value={business.clientRating} />
            </Stat>
          </dl>
          {business.paymentVerified ? (
            <p className="y-micro y-fg-2 inline-flex items-center gap-1.5">
              <ShieldCheck size={14} aria-hidden /> Payment method verified
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  ) : null;

  return (
    <Block as="section" tone="paper" pad="md" aria-labelledby="people-title" className="flex flex-col gap-5">
      <h2 id="people-title" className="y-head">
        People
      </h2>
      {role === "business" ? (
        <>
          {creatorRow}
          <div className="border-t border-(--b-line)" />
          {businessRow}
        </>
      ) : (
        <>
          {businessRow}
          <div className="border-t border-(--b-line)" />
          {creatorRow}
        </>
      )}
      <PillButton variant="soft" icon={<MessageCircle size={18} aria-hidden />} onClick={ws.goToMessages}>
        Message {ws.otherName}
      </PillButton>
    </Block>
  );
}

const paymentInfo: Record<PaymentStatus, { label: string; tone: BadgeTone; icon: React.ReactNode }> = {
  authorized: { label: "Authorised", tone: "info", icon: <CreditCard size={14} aria-hidden /> },
  held: { label: "Held safely", tone: "info", icon: <ShieldCheck size={14} aria-hidden /> },
  released: { label: "Released", tone: "success", icon: <CheckCircle2 size={14} aria-hidden /> },
  refunded: { label: "Refunded", tone: "neutral", icon: <RotateCcw size={14} aria-hidden /> },
};

function Money({ ws }: { ws: Workspace }) {
  const s = useDemo();
  const { commission, role, creatorName, businessName, totals } = ws;
  const status = commission.payment.status;
  const info = paymentInfo[status];
  const method = s.paymentMethods.find((m) => m.id === commission.payment.methodId);
  const released = commission.completedAt ? ` on ${shortDate(commission.completedAt)}` : "";

  const copy: Record<PaymentStatus, string> =
    role === "business"
      ? {
          authorized: `${cash(totals.total)} is authorised on your card. You're charged only if ${creatorName} accepts.`,
          held: `Yapp holds ${cash(totals.total)}. It's released to ${creatorName} only when you approve.`,
          released: `${cash(totals.creatorEarns)} was paid to ${creatorName}${released}, plus the ${cash(totals.fee)} service fee.`,
          refunded: commission.acceptedAt
            ? `${cash(totals.total)} was refunded to your card in full.`
            : `The authorisation was released. You weren't charged.`,
        }
      : {
          authorized: `${businessName} has authorised the full amount. It's secured the moment you accept.`,
          held: `Yapp holds your ${cash(totals.creatorEarns)}. It's paid to you when ${businessName} approves, or automatically 3 days after delivery if they don't respond.`,
          released: `${cash(totals.creatorEarns)} was paid to you${released}. It's in your available balance.`,
          refunded: `${businessName} was refunded. Nothing is due on this commission.`,
        };

  return (
    <Block as="section" tone="paper" pad="md" aria-labelledby="money-title" className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="money-title" className="y-head">
          Money
        </h2>
        <Badge tone={info.tone} icon={info.icon}>
          {info.label}
        </Badge>
      </div>
      <PriceSummary
        price={commission.price}
        priceLabel={role === "business" ? `${creatorName}'s price` : "Your price"}
        addons={commission.addons}
        feeRate={commission.feeRate}
        perspective={role}
        showRights={role === "business"}
      />
      <p className="y-small">{copy[status]}</p>
      {role === "business" && method ? (
        <p className="y-micro y-fg-2 inline-flex items-center gap-1.5">
          <CreditCard size={14} aria-hidden /> {paymentLabel(method)}
        </p>
      ) : null}
      {role === "business" ? (
        status === "held" || status === "authorized" ? <ProtectedNote compact /> : null
      ) : status === "held" || status === "authorized" ? (
        <p className="y-micro y-fg-2 inline-flex items-start gap-1.5">
          <ShieldCheck size={14} aria-hidden className="mt-px flex-none" />
          Payment protection: the money is secured before you start, so you never chase an invoice.
        </p>
      ) : null}
    </Block>
  );
}

function Dates({ ws }: { ws: Workspace }) {
  const { commission, latest } = ws;
  const auto = commission.status === "delivered" ? autoApproveDate(commission, latest) : undefined;
  const ended = ["completed", "cancelled", "declined"].includes(commission.status);
  const rows: { label: string; value: string; strong?: boolean }[] = [
    { label: commission.source === "request" ? "Hired" : "Offer sent", value: commission.createdAt },
    ...(commission.acceptedAt && commission.source !== "request"
      ? [{ label: "Accepted", value: commission.acceptedAt }]
      : []),
    ...(ended ? [] : [{ label: "Due", value: commission.dueDate, strong: commission.status !== "delivered" }]),
    ...(latest ? [{ label: `Version ${latest.version} delivered`, value: latest.deliveredAt }] : []),
    ...(auto ? [{ label: "Auto-approves", value: auto, strong: true }] : []),
    ...(commission.completedAt ? [{ label: "Completed", value: commission.completedAt }] : []),
  ];
  const used = commission.revisionsUsed;
  const included = commission.revisionsIncluded;
  const slots = Math.max(included, used);

  return (
    <Block as="section" tone="paper" pad="md" aria-labelledby="dates-title" className="flex flex-col gap-5">
      <h2 id="dates-title" className="y-head">
        Dates
      </h2>
      <dl className="flex flex-col">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-4 border-b border-(--b-line) py-2.5 last:border-b-0"
          >
            <dt className="y-small y-fg-2">{row.label}</dt>
            <dd className={`y-small y-num text-end ${row.strong ? "font-semibold" : ""}`}>
              {weekdayDate(row.value)} <span className="y-fg-2">· {timeOf(row.value)}</span>
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2 border-t border-(--b-line) pt-4">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="y-small font-semibold">Revisions used</h3>
          <span className="y-small y-num font-semibold">
            {used} of {included}
          </span>
        </div>
        <span className="flex gap-1" role="img" aria-label={`${used} of ${included} revision rounds used`}>
          {Array.from({ length: Math.max(1, slots) }, (_, i) => (
            <span
              key={i}
              className={`h-2 flex-1 rounded-full ${
                i < used ? (i >= included ? "bg-(--y-warning)" : "bg-(--b-fg)") : "bg-(--b-line)"
              }`}
            />
          ))}
        </span>
        <p className="y-micro y-fg-2">
          {used > included
            ? `${used - included} extra round${used - included === 1 ? "" : "s"} beyond the package.`
            : included - used
              ? `${included - used} round${included - used === 1 ? "" : "s"} of changes left.`
              : "All included rounds used. Extra rounds are agreed with the creator."}
        </p>
      </div>
    </Block>
  );
}

function Help({ ws }: { ws: Workspace }) {
  const toast = useToast();
  const { commission, role } = ws;
  const canReport = ["in_progress", "delivered", "revision"].includes(commission.status);
  const canCancel = role === "business" && commission.status === "in_progress" && commission.deliveries.length === 0;

  return (
    <Block as="section" tone="mist" pad="md" aria-labelledby="help-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="help-title" className="y-head">
          Need help?
        </h2>
        <p className="y-small y-fg-2">
          {commission.status === "disputed"
            ? "Yapp support is already helping on this commission. Replies arrive in your messages."
            : "Something not going to plan? We step in, read the whole history and keep the payment protected meanwhile."}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {canReport ? (
          <PillButton variant="outline" icon={<Flag size={18} aria-hidden />} onClick={() => ws.openSheet("report")}>
            Report a problem
          </PillButton>
        ) : (
          <PillButton
            variant="outline"
            icon={<LifeBuoy size={18} aria-hidden />}
            onClick={() =>
              toast({ message: "Yapp support will reply in your messages within a few hours.", tone: "info" })
            }
          >
            Contact support
          </PillButton>
        )}
        {canCancel ? (
          <PillButton variant="ghost" icon={<Ban size={18} aria-hidden />} onClick={() => ws.openSheet("cancel")}>
            Cancel commission
          </PillButton>
        ) : null}
      </div>
      <p className="y-micro y-fg-2 inline-flex items-center gap-1.5">
        <Clock size={14} aria-hidden /> Support replies within 24 hours, usually much sooner.
      </p>
    </Block>
  );
}
