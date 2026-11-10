"use client";

import { ChevronRight, MessageCircle, Star } from "lucide-react";
import Link from "next/link";

import { BusinessLogo } from "@/components/domain/business-logo";
import { CommissionBadge, SlotBadge } from "@/components/domain/status-badge";
import { Block } from "@/components/ui/block";
import { StatBox, StatGrid } from "@/components/ui/data";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { CardHead } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet, SheetActions } from "@/components/ui/sheet";
import { money, moneyExact, plural, shortDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { formatFigure, type BrandReport, type BrandRow, type CreatorReport, type CreatorRow, type Period } from "@/lib/productivity";
import { commissionTotals } from "@/lib/selectors";
import type { Commission } from "@/lib/types";

/** Which row's sheet is open: a creator id (brand view) or a business id (creator view). */
export type PersonKey = string | null;

type Rate = { hit: number; of: number };
const rate = (r: Rate) => (r.of ? `${r.hit} of ${r.of}` : "—");
const rating = (value: number | null) =>
  value === null ? (
    "—"
  ) : (
    <span className="inline-flex items-center gap-1">
      <Star size={12} strokeWidth={0} fill="currentColor" aria-hidden className="text-(--y-ink)" />
      {value.toFixed(1)}
      <span className="sr-only"> out of 5</span>
    </span>
  );

/* -------------------------------------------------------------------------- */
/* Brand view: creators you worked with                                        */
/* -------------------------------------------------------------------------- */

export function CreatorsCard({ report, onOpen }: { report: BrandReport; onOpen: (key: string) => void }) {
  const rows = report.people;
  return (
    <Block as="section" tone="paper" pad="none" className="y-pd-card" aria-labelledby="pd-people-t">
      <CardHead id="pd-people-t" as="h2" title="Creators you worked with" count={rows.length || undefined} aside={report.period.label} />
      {rows.length === 0 ? (
        <NoPeople period={report.period} who="creators" />
      ) : (
        <>
          <table className="y-pd-table">
            <caption className="sr-only">Creators you worked with in the {report.period.label.toLowerCase()}</caption>
            <thead>
              <tr>
                <th scope="col">Creator</th>
                <th scope="col">Orders</th>
                <th scope="col">Videos</th>
                <th scope="col">On time</th>
                <th scope="col">First version approved</th>
                <th scope="col">Changes asked</th>
                <th scope="col">Spend</th>
                <th scope="col">Your rating</th>
                <th scope="col">
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.creator.id}>
                  <th scope="row">
                    <button type="button" className="y-pd-row-btn" onClick={() => onOpen(row.creator.id)}>
                      <FaceAvatar id={row.creator.id} name="" size={32} />
                      <span className="min-w-0">
                        <span className="y-pd-name">{row.creator.name}</span>
                        <span className="y-pd-sub">@{row.creator.handle}</span>
                      </span>
                    </button>
                  </th>
                  <td>{row.orders}</td>
                  <td>{row.videos}</td>
                  <td>{rate(row.onTime)}</td>
                  <td>{rate(row.firstPass)}</td>
                  <td>{row.changes}</td>
                  <td>{moneyExact(row.spend)}</td>
                  <td>{rating(row.rating)}</td>
                  <td aria-hidden>
                    <ChevronRight size={16} className="y-flip y-fg-3" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="y-pd-rows">
            {rows.map((row) => (
              <li key={row.creator.id}>
                <button type="button" className="y-pd-rowcard" onClick={() => onOpen(row.creator.id)}>
                  <FaceAvatar id={row.creator.id} name="" size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="y-pd-name">{row.creator.name}</span>
                    <span className="y-pd-sub">
                      {plural(row.orders, "order")}
                      {row.onTime.of ? ` · ${rate(row.onTime)} on time` : ""}
                    </span>
                  </span>
                  <span className="y-pd-val">
                    {moneyExact(row.spend)}
                    <span className="y-pd-sub">spend</span>
                  </span>
                  <ChevronRight size={16} aria-hidden className="y-flip y-fg-3 flex-none" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* Creator view: brands you worked with                                        */
/* -------------------------------------------------------------------------- */

export function BrandsCard({ report, onOpen }: { report: CreatorReport; onOpen: (key: string) => void }) {
  const rows = report.people;
  return (
    <Block as="section" tone="paper" pad="none" className="y-pd-card" aria-labelledby="pd-people-t">
      <CardHead
        id="pd-people-t"
        as="h2"
        title="Brands you worked with"
        count={rows.length || undefined}
        aside={
          <span className="inline-flex items-center gap-1.5">
            <Star size={13} strokeWidth={0} fill="currentColor" aria-hidden className="text-(--y-ink)" />
            <span>
              <span className="font-semibold text-(--y-ink)">{report.rating.value.toFixed(1)}</span> your rating ·{" "}
              {plural(report.rating.count, "review")}
            </span>
          </span>
        }
      />
      {rows.length === 0 ? (
        <NoPeople period={report.period} who="brands" />
      ) : (
        <>
          <table className="y-pd-table">
            <caption className="sr-only">Brands you worked with in the {report.period.label.toLowerCase()}</caption>
            <thead>
              <tr>
                <th scope="col">Brand</th>
                <th scope="col">Orders</th>
                <th scope="col">Earned</th>
                <th scope="col">Their review time</th>
                <th scope="col">Changes asked</th>
                <th scope="col">Rated you</th>
                <th scope="col">Repeat</th>
                <th scope="col">
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.business.id}>
                  <th scope="row">
                    <button type="button" className="y-pd-row-btn" onClick={() => onOpen(row.business.id)}>
                      <BusinessLogo business={row.business} size={32} />
                      <span className="min-w-0">
                        <span className="y-pd-name">{row.business.name}</span>
                        <span className="y-pd-sub">{plural(row.orders, "order")} this period</span>
                      </span>
                    </button>
                  </th>
                  <td>{row.orders}</td>
                  <td>{moneyExact(row.earned)}</td>
                  <td>{formatFigure(row.reviewHours, "hours")}</td>
                  <td>{row.changes}</td>
                  <td>{rating(row.ratedYou)}</td>
                  <td>{row.repeat ? <span className="y-pd-repeat">Repeat client</span> : <span className="y-fg-2">First order</span>}</td>
                  <td aria-hidden>
                    <ChevronRight size={16} className="y-flip y-fg-3" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="y-pd-rows">
            {rows.map((row) => (
              <li key={row.business.id}>
                <button type="button" className="y-pd-rowcard" onClick={() => onOpen(row.business.id)}>
                  <BusinessLogo business={row.business} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="y-pd-name">{row.business.name}</span>
                    <span className="y-pd-sub">
                      {plural(row.orders, "order")}
                      {row.repeat ? " · Repeat client" : ""}
                    </span>
                  </span>
                  <span className="y-pd-val">
                    {moneyExact(row.earned)}
                    <span className="y-pd-sub">earned</span>
                  </span>
                  <ChevronRight size={16} aria-hidden className="y-flip y-fg-3 flex-none" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Block>
  );
}

function NoPeople({ period, who }: { period: Period; who: "creators" | "brands" }) {
  return (
    <div className="y-pd-flat">
      <p className="y-small y-fg-2">
        No {who} in the {period.label.toLowerCase()}. Try a longer range.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The sheet behind a row: the period's figures and every order with them      */
/* -------------------------------------------------------------------------- */

function OrderList({ commissions, side }: { commissions: Commission[]; side: "business" | "creator" }) {
  return (
    <ul className="y-pd-orders">
      {commissions.map((c) => {
        const totals = commissionTotals(c);
        const when = c.completedAt ?? c.acceptedAt ?? c.createdAt;
        return (
          <li key={c.id}>
            <Link href={paths.commission(c.id)} className="y-pd-order">
              <span className="min-w-0 flex-1">
                <span className="y-pd-name">{c.title}</span>
                <span className="y-pd-sub">
                  {c.status === "completed" ? "Approved" : c.status === "offered" ? "Offered" : "Started"} {shortDate(when)} ·{" "}
                  {side === "business" ? money(totals.total) : `${moneyExact(totals.creatorEarns)} to you`}
                </span>
              </span>
              {c.source === "campaign" ? (
                <SlotBadge commission={c} side={side} className="flex-none" />
              ) : (
                <CommissionBadge status={c.status} side={side} className="flex-none" />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function CreatorSheet({ row, period, onClose }: { row: CreatorRow | undefined; period: Period; onClose: () => void }) {
  const lastDone = row?.commissions.find((c) => c.status === "completed" && c.source !== "campaign");
  return (
    <Sheet
      open={Boolean(row)}
      onClose={onClose}
      title={row?.creator.name ?? ""}
      description={row ? `@${row.creator.handle} · ${period.label}` : undefined}
      footer={
        row ? (
          <SheetActions>
            <PillButton href={paths.creator(row.creator.handle)} variant="soft">
              View profile
            </PillButton>
            <PillButton href={paths.orderCreator(row.creator.handle, lastDone ? { again: lastDone.id } : {})} variant="contrast">
              Order again
            </PillButton>
          </SheetActions>
        ) : null
      }
    >
      {row ? (
        <div className="flex flex-col gap-6">
          <StatGrid columns={2}>
            <StatBox size="md" value={row.orders} label="Orders this period" />
            <StatBox size="md" value={row.videos} label="Videos approved" />
            <StatBox size="md" value={rate(row.onTime)} label="First versions on time" />
            <StatBox size="md" value={moneyExact(row.spend)} label="Spend" />
          </StatGrid>
          <div className="flex flex-col gap-2">
            <h3 className="y-small font-semibold">Orders with {row.creator.firstName}</h3>
            <OrderList commissions={row.commissions} side="business" />
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}

export function BrandSheet({ row, period, onClose }: { row: BrandRow | undefined; period: Period; onClose: () => void }) {
  const thread = row?.commissions[0]?.threadId;
  return (
    <Sheet
      open={Boolean(row)}
      onClose={onClose}
      title={row?.business.name ?? ""}
      description={row ? `${row.repeat ? "Repeat client" : "First order"} · ${period.label}` : undefined}
      footer={
        row && thread ? (
          <SheetActions>
            <PillButton href={paths.messages(thread)} variant="contrast" icon={<MessageCircle size={18} aria-hidden />}>
              Message {row.business.name}
            </PillButton>
          </SheetActions>
        ) : null
      }
    >
      {row ? (
        <div className="flex flex-col gap-6">
          <StatGrid columns={2}>
            <StatBox size="md" value={row.orders} label="Orders this period" />
            <StatBox size="md" value={moneyExact(row.earned)} label="Earned, after the fee" />
            <StatBox size="md" value={formatFigure(row.reviewHours, "hours")} label="Their review time" />
            <StatBox size="md" value={row.ratedYou === null ? "—" : row.ratedYou.toFixed(1)} label="Rated you" />
          </StatGrid>
          <div className="flex flex-col gap-2">
            <h3 className="y-small font-semibold">Orders with {row.business.name}</h3>
            <OrderList commissions={row.commissions} side="creator" />
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
