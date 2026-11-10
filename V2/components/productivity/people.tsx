"use client";

import { Repeat2, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { CommissionBadge, SlotBadge } from "@/components/domain/status-badge";
import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { List, Row } from "@/components/ui/list";
import { SectionLabel } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { KeyValues } from "@/components/ui/progress";
import { Sheet } from "@/components/ui/sheet";
import { moneyExact, plural, shortDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { formatFigure, type BrandReport, type BrandRow, type CreatorReport, type CreatorRow, type Period } from "@/lib/productivity";
import { reliabilitySummary } from "@/lib/selectors";
import type { Commission, Role } from "@/lib/types";

type Rate = { hit: number; of: number };
const rate = (r: Rate) => (r.of ? `${r.hit} of ${r.of}` : "—");

function Stars({ value }: { value: number | null }) {
  if (value === null) return <>—</>;
  return (
    <span className="inline-flex items-center gap-1">
      <Star size={13} aria-hidden className="fill-current" />
      <span className="y-num">{value.toFixed(1)}</span>
      <span className="sr-only"> out of 5</span>
    </span>
  );
}

/** Rows shown before "Show all". */
const SHOWN = 5;

/** The last row of a capped list. */
function ShowAll({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button type="button" role="listitem" onClick={onClick} className="y-row y-small !min-h-12 justify-center font-medium">
      Show all {count}
    </button>
  );
}

/** Money at the end of a row only when there is some (most work is still held, so $0 says little). */
const amount = (value: number) => (value > 0 ? <span className="y-small y-num font-medium">{moneyExact(value)}</span> : undefined);

/** A section's title row and, when it's empty, the one quiet line saying so. */
function Empty({ period, who }: { period: Period; who: string }) {
  return (
    <Block tone="paper" pad="md">
      <p className="y-small y-fg-2">
        No {who} in the {period.label.toLowerCase()}. Try a longer range.
      </p>
    </Block>
  );
}

/** Every order with one person: newest first, each a row into its job. */
function OrdersList({ commissions, side }: { commissions: Commission[]; side: Role }) {
  return (
    <section aria-labelledby="pd-orders-t" className="flex flex-col gap-2">
      <h3 id="pd-orders-t" className="y-head">
        Orders
      </h3>
      <List flush label="Orders">
        {commissions.map((c) => (
          <Row
            key={c.id}
            href={paths.job(c.id)}
            title={c.title}
            meta={shortDate(c.completedAt ?? c.acceptedAt ?? c.createdAt)}
            end={c.source === "campaign" ? <SlotBadge commission={c} side={side} /> : <CommissionBadge status={c.status} side={side} />}
            className="!px-0"
          />
        ))}
      </List>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Brand side: creators you worked with                                        */
/* -------------------------------------------------------------------------- */

export function CreatorsSection({ report, onOpen }: { report: BrandReport; onOpen: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const rows = report.people;
  return (
    <section aria-labelledby="pd-people-t">
      <SectionLabel id="pd-people-t">
        Creators you worked with {rows.length ? <span className="y-fg-2 y-num font-normal">{rows.length}</span> : null}
      </SectionLabel>
      {rows.length ? (
        <List label="Creators you worked with">
          {(all ? rows : rows.slice(0, SHOWN)).map((row) => (
            <Row
              key={row.creator.id}
              onClick={() => onOpen(row.creator.id)}
              ariaLabel={`${row.creator.name}: ${plural(row.orders, "order")}, ${moneyExact(row.spend)} released. Details`}
              lead={<FaceAvatar id={row.creator.id} name="" size={40} />}
              title={row.creator.name}
              meta={[plural(row.orders, "order"), row.onTime.of ? `${rate(row.onTime)} on time` : null].filter(Boolean).join(" · ")}
              end={amount(row.spend)}
            />
          ))}
          {!all && rows.length > SHOWN ? <ShowAll count={rows.length} onClick={() => setAll(true)} /> : null}
        </List>
      ) : (
        <Empty period={report.period} who="orders with creators" />
      )}
    </section>
  );
}

export function CreatorSheet({ row, period, onClose }: { row: CreatorRow | undefined; period: Period; onClose: () => void }) {
  const again = row?.commissions.find((c) => c.status === "completed" && c.source !== "campaign");
  return (
    <Sheet
      open={Boolean(row)}
      onClose={onClose}
      title={row?.creator.name ?? ""}
      description={row ? `@${row.creator.handle} · ${period.label}` : undefined}
      width="sm"
      footer={
        row ? (
          <div className="flex flex-wrap gap-2">
            <PillButton
              href={paths.orderCreator(row.creator.handle, { again: again?.id })}
              variant="neon"
              icon={<Repeat2 size={17} aria-hidden />}
            >
              {again ? `Order from ${row.creator.firstName} again` : `Order from ${row.creator.firstName}`}
            </PillButton>
            <PillButton href={paths.creator(row.creator.handle)} variant="soft">
              Profile
            </PillButton>
          </div>
        ) : null
      }
    >
      {row ? (
        <div className="flex flex-col gap-6">
          <KeyValues
            rows={[
              { label: "Orders", value: row.orders },
              { label: "Videos approved", value: row.videos },
              { label: "First versions on time", value: rate(row.onTime) },
              { label: "Approved on the first version", value: rate(row.firstPass) },
              { label: "Changes you asked for", value: row.changes },
              { label: "Spend", value: moneyExact(row.spend) },
              { label: "Your rating", value: <Stars value={row.rating} /> },
            ]}
          />
          <OrdersList commissions={row.commissions} side="business" />
        </div>
      ) : null}
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Creator side: brands you worked with                                        */
/* -------------------------------------------------------------------------- */

export function BrandsSection({ report, onOpen }: { report: CreatorReport; onOpen: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const rows = report.people;
  return (
    <section aria-labelledby="pd-people-t">
      <SectionLabel id="pd-people-t">
        Brands you worked with {rows.length ? <span className="y-fg-2 y-num font-normal">{rows.length}</span> : null}
      </SectionLabel>
      {rows.length ? (
        <List label="Brands you worked with">
          {(all ? rows : rows.slice(0, SHOWN)).map((row) => (
            <Row
              key={row.business.id}
              onClick={() => onOpen(row.business.id)}
              ariaLabel={`${row.business.name}: ${plural(row.orders, "order")}, ${moneyExact(row.earned)} earned. Details`}
              lead={<BusinessLogo business={row.business} size={40} />}
              title={row.business.name}
              meta={[
                plural(row.orders, "order"),
                row.reviewHours !== null ? `reviews in ${formatFigure(row.reviewHours, "hours")}` : null,
                row.repeat ? "ordered again" : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              end={amount(row.earned)}
            />
          ))}
          {!all && rows.length > SHOWN ? <ShowAll count={rows.length} onClick={() => setAll(true)} /> : null}
        </List>
      ) : (
        <Empty period={report.period} who="orders with brands" />
      )}
    </section>
  );
}

export function BrandSheet({ row, period, onClose }: { row: BrandRow | undefined; period: Period; onClose: () => void }) {
  const reliability = row ? reliabilitySummary(row.business) : undefined;
  return (
    <Sheet
      open={Boolean(row)}
      onClose={onClose}
      title={row?.business.name ?? ""}
      description={period.label}
      width="sm"
    >
      {row ? (
        <div className="flex flex-col gap-6">
          <KeyValues
            rows={[
              { label: "Orders", value: row.orders },
              { label: "You earned", value: moneyExact(row.earned) },
              { label: "Their review time", value: formatFigure(row.reviewHours, "hours") },
              { label: "Changes they asked for", value: row.changes },
              { label: "They rated you", value: <Stars value={row.ratedYou} /> },
              { label: "Ordered from you again", value: row.repeat ? "Yes" : "Not yet" },
            ]}
          />
          {reliability ? (
            <p className="y-small y-fg-2">
              <span className="font-medium text-(--y-ink)">On Yapp: </span>
              {reliability}
            </p>
          ) : null}
          <OrdersList commissions={row.commissions} side="creator" />
          <p className="y-micro y-fg-2">
            Earnings are what you received after Yapp&apos;s fee. Your feedback about a brand stays private.{" "}
            <Link href={paths.wallet} className="y-link font-medium text-(--y-ink)">
              Earnings
            </Link>
          </p>
        </div>
      ) : null}
    </Sheet>
  );
}
