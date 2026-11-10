"use client";

import { BadgeCheck, MessageSquare, ShieldCheck, UserRound } from "lucide-react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { paymentLabel } from "@/components/domain/money";
import { Block } from "@/components/ui/block";
import { DetailRows, StatBox, StatGrid } from "@/components/ui/data";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { Note } from "@/components/ui/note";
import { CardHead } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { compact, daysFromNow, plural, shortDate, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { cityById, keepLiveUntil, reliabilityFigures } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { addonById, CAMPAIGN_KEEP_LIVE_DAYS, CAMPAIGN_RELEASE_DAYS, FEE_PCT, usageById } from "@/lib/taxonomy";

import { cash, categoryOf, revisionsLine, type Workspace } from "./helpers";

/**
 * The side column (Work spec 6.8.5, 6.8.6): the Details card (money first, then the due date,
 * revisions and usage) and the person card. The brand sees what it pays, held and released on
 * approval, with no fee line; the creator sees what they earn after Yapp's 20% beside the listed
 * price. Campaign slots: the slot's terms and the posting rules.
 */
export function SidePanels({ ws }: { ws: Workspace }) {
  return (
    <>
      <DetailsCard ws={ws} />
      <PersonCard ws={ws} />
    </>
  );
}

type RowItem = { label: React.ReactNode; value: React.ReactNode; look?: "danger" | "success" };

function DetailsCard({ ws }: { ws: Workspace }) {
  const s = useDemo();
  const toast = useToast();
  const { commission: c, side, creatorName, businessName, totals, slot } = ws;
  const status = c.status;
  const method = s.paymentMethods.find((m) => m.id === c.payment.methodId);
  const ended = ["completed", "cancelled", "declined"].includes(status);
  // Red only while the work is still owed (a delivered version met the date).
  const dueToday = daysFromNow(c.dueDate) <= 0 && (status === "in_progress" || status === "revision");
  const canExtend = !slot && side === "business" && (status === "in_progress" || status === "revision");
  const canReport = ["in_progress", "delivered", "revision"].includes(status);
  const canCancel = !slot && side === "business" && status === "in_progress" && c.deliveries.length === 0;
  const canRemove = Boolean(slot) && side === "business" && status === "in_progress" && c.deliveries.length === 0;
  const paidOn = c.completedAt ? shortDate(c.completedAt) : undefined;
  // A direct offer withdrawn or declined before it was accepted was only ever authorized.
  const neverCharged = !slot && c.source !== "request" && !c.acceptedAt;
  const payment = neverCharged && c.payment.status === "refunded" ? "authorized" : c.payment.status;

  let big: string | undefined = cash(side === "creator" ? totals.creatorEarns : totals.total);
  let sub = "";
  let note: React.ReactNode = null;
  const rows: RowItem[] = [];

  const dueRow = (): RowItem => ({
    label: "Due",
    value: (
      <>
        {dueToday ? (daysFromNow(c.dueDate) < 0 ? `${weekdayDate(c.dueDate)} · late` : "Today") : weekdayDate(c.dueDate)}
        {canExtend ? (
          <button type="button" className="y-ord-inline-link y-hit" onClick={() => ws.openSheet("extend")}>
            Extend
          </button>
        ) : null}
      </>
    ),
    look: dueToday ? "danger" : undefined,
  });
  const usageRow: RowItem = { label: "Usage rights", value: usageById[c.brief.usage].name };

  if (slot) {
    const days = slot.terms?.deadlineDays;
    const verified = c.post?.status === "live";
    const keepUntil = keepLiveUntil(c);
    if (side === "creator") {
      sub = `You earn · after the ${FEE_PCT}% Yapp fee on ${cash(totals.total)}`;
      if (status === "cancelled") {
        big = undefined;
        note = <>This slot ended. Nothing was paid.</>;
      } else if (payment === "released") {
        note = (
          <>
            <b>Released</b> · in your wallet
          </>
        );
      } else if (c.post?.status === "removed") {
        note = (
          <>
            <b>On hold</b> · your post is down
          </>
        );
      } else if (verified && c.withdrawableFrom) {
        note = (
          <>
            <b>Pending</b> · released {weekdayDate(c.withdrawableFrom)} if the post stays up
          </>
        );
      } else {
        note = (
          <>
            <b>Reserved for you</b> · paid {CAMPAIGN_RELEASE_DAYS} days after your post is verified
          </>
        );
      }
      rows.push({ label: "Price per Yapp", value: cash(totals.total) });
    } else {
      sub = "Price per Yapp · held with the campaign";
      note =
        payment === "released" ? (
          <>
            <b>Paid</b> · released to {creatorName}
          </>
        ) : payment === "returned" ? (
          <>
            <b>Back in your campaign</b> · the slot reopened
          </>
        ) : payment === "refunded" ? (
          <>
            <b>Refunded</b> · back on your card
          </>
        ) : verified && c.withdrawableFrom ? (
          <>
            <b>{cash(totals.total)} held</b> · paid to {creatorName} {weekdayDate(c.withdrawableFrom)} if it&apos;s still up
          </>
        ) : (
          <>
            <b>{cash(totals.total)} held</b> · paid to {creatorName} {CAMPAIGN_RELEASE_DAYS} days after the post is verified
          </>
        );
    }
    if (days) rows.push({ label: "Deadline", value: `${plural(days, "day")} · set by ${side === "business" ? "you" : businessName}` });
    if (status === "in_progress" && c.deliveries.length === 0)
      rows.push({ label: "Upload by", value: weekdayDate(c.dueDate), look: dueToday ? "danger" : undefined });
    rows.push({
      label: side === "business" ? "Posts on" : "Post on",
      value: `${slot.platformName}${slot.social && side === "creator" ? ` · @${slot.social.handle}` : ""}`,
    });
    rows.push({ label: "Tag", value: slot.brandHandle });
    rows.push({ label: "Label", value: "Paid partnership on" });
    rows.push({
      label: "Keep it up",
      value: keepUntil ? `Until ${weekdayDate(keepUntil)}` : `${CAMPAIGN_KEEP_LIVE_DAYS} days from verification`,
    });
    if (!ended) rows.push({ label: "Revisions", value: revisionsLine(c) });
    rows.push(usageRow);
  } else if (side === "business") {
    const name = creatorName;
    if (payment === "authorized") {
      sub = status === "declined" ? "Total · not charged" : `Total · charged if ${name} accepts`;
      note =
        status === "declined" || status === "cancelled" ? (
          <>
            <b>Released</b> · you weren&apos;t charged
          </>
        ) : (
          <>
            <b>Authorized</b> · charged only if {name} accepts
          </>
        );
    } else if (payment === "released") {
      sub = `Total · paid${paidOn ? ` ${paidOn}` : ""}`;
      note = (
        <>
          <b>{cash(totals.total)} paid</b> · released to {name}
          {paidOn ? ` on ${paidOn}` : ""}
        </>
      );
    } else if (payment === "refunded") {
      sub = "Total · refunded";
      note = (
        <>
          <b>{cash(totals.total)} refunded</b> · back on your card
        </>
      );
    } else {
      sub = "Total · held since you hired";
      note =
        status === "disputed" ? (
          <>
            <b>{cash(totals.total)} held</b> · while Yapp support helps
          </>
        ) : (
          <>
            <b>{cash(totals.total)} held</b> · released to {name} when you approve
          </>
        );
    }
    rows.push({ label: `${name}'s price`, value: cash(c.price) });
    for (const addon of c.addons) rows.push({ label: addonById[addon.id]?.name ?? "Add-on", value: cash(addon.price) });
    if (!ended) rows.push(dueRow());
    rows.push({ label: "Revisions", value: revisionsLine(c) });
    rows.push(usageRow);
  } else {
    sub = `You earn · after the ${FEE_PCT}% Yapp fee on ${cash(totals.total)}`;
    note =
      payment === "authorized" ? (
        status === "declined" || status === "cancelled" ? (
          <>Nothing was charged.</>
        ) : (
          <>
            <b>Authorized</b> · held for you when you accept
          </>
        )
      ) : payment === "released" ? (
        <>
          <b>Paid</b> · in your wallet{paidOn ? ` since ${paidOn}` : ""}
        </>
      ) : payment === "refunded" ? (
        <>
          <b>Refunded</b> to {businessName}
        </>
      ) : (
        <>
          <b>Held by Yapp</b> · lands in your wallet on approval
        </>
      );
    rows.push({ label: "Your price", value: cash(c.price) });
    for (const addon of c.addons) rows.push({ label: addonById[addon.id]?.name ?? "Add-on", value: cash(addon.price) });
    rows.push({ label: `Yapp fee (${Math.round(c.feeRate * 100)}%)`, value: `−${cash(totals.fee)}` });
    if (!ended) rows.push(dueRow());
    rows.push({ label: "Revisions", value: revisionsLine(c) });
    rows.push(usageRow);
  }

  const getHelp = () => {
    if (canReport) {
      ws.openSheet("report");
      return;
    }
    toast({
      message:
        status === "disputed"
          ? "Yapp support is already on it. A person replies in Messages within 48 hours."
          : "Yapp support replies in your Messages within a few hours.",
      tone: "info",
    });
  };

  return (
    <Block as="section" tone="paper" pad="none" aria-labelledby="details-title" className="y-ord-card y-ord-body">
      <CardHead id="details-title" as="h2" title="Details" />
      {big ? (
        <>
          <p className="y-fig-xl y-ord-big">{big}</p>
          <p className="y-small y-fg-2">{sub}</p>
        </>
      ) : null}
      <Note icon={<ShieldCheck size={16} aria-hidden />} className="y-ord-paystat">
        {note}
      </Note>
      <DetailRows rows={rows} />
      {side === "business" && method && !slot && payment !== "authorized" ? (
        <p className="y-micro y-fg-2 pt-1">Paid with {paymentLabel(method)}</p>
      ) : null}
      <p className="y-ord-help">
        <button type="button" className="y-ord-inline-link y-hit" onClick={getHelp}>
          Get help
        </button>
        {canCancel ? (
          <button type="button" className="y-ord-inline-link y-hit" onClick={() => ws.openSheet("cancel")}>
            Cancel order
          </button>
        ) : null}
        {canRemove ? (
          <button type="button" className="y-ord-inline-link y-hit" onClick={() => ws.openSheet("removeCreator")}>
            Remove creator
          </button>
        ) : null}
      </p>
    </Block>
  );
}

/** The other side: the brand sees the creator, the creator sees the brand's reliability. */
function PersonCard({ ws }: { ws: Workspace }) {
  const { side, creator, business, slot } = ws;

  if (side === "business") {
    if (!creator) return null;
    const city = cityById(creator.cityId)?.name;
    return (
      <Block as="section" tone="paper" pad="none" aria-label={`About ${creator.name}`} className="y-ord-card y-ord-body">
        <div className="y-ord-person">
          <FaceAvatar id={creator.id} name="" size={52} />
          <span className="min-w-0">
            <b>
              <span className="inline-flex items-center gap-1">
                {creator.name}
                {slot?.social?.verified ? <BadgeCheck size={15} role="img" aria-label="Followers verified" /> : null}
              </span>
            </b>
            <small>
              @{creator.handle}
              {city ? ` · ${city}` : ""}
            </small>
          </span>
        </div>
        <StatGrid>
          <StatBox value={creator.reviewCount ? creator.rating.toFixed(1) : "—"} label="Rating" />
          <StatBox value={`${creator.onTimeRate}%`} label="On time" />
          {slot?.social ? (
            <StatBox value={compact(slot.social.followers)} label={`${slot.platformName} followers`} />
          ) : (
            <StatBox value={creator.completed >= 3 ? `${creator.repeatClientRate}%` : "—"} label="Repeat clients" />
          )}
        </StatGrid>
        <div className="y-ord-person-actions">
          <PillButton variant="soft" icon={<MessageSquare size={16} aria-hidden />} onClick={ws.goToMessages}>
            Message
          </PillButton>
          <PillButton variant="soft" icon={<UserRound size={16} aria-hidden />} href={paths.creator(creator.handle)}>
            Profile
          </PillButton>
        </div>
      </Block>
    );
  }

  if (!business) return null;
  const figures = reliabilityFigures(business);
  const city = cityById(business.cityId)?.name;
  const category = categoryOf(ws);
  const line = [category, city, business.verified ? "verified brand" : null].filter(Boolean).join(" · ");
  return (
    <Block as="section" tone="paper" pad="none" aria-label={`About ${business.name}`} className="y-ord-card y-ord-body">
      <div className="y-ord-person">
        <BusinessLogo business={business} size={52} />
        <span className="min-w-0">
          <b>{business.name}</b>
          <small>{line}</small>
        </span>
      </div>
      <StatGrid>
        {figures.slice(0, 3).map((f) => (
          <StatBox key={f.id} value={f.value} label={<span title={f.hint}>{f.label}</span>} />
        ))}
      </StatGrid>
      <StatGrid columns={2} className="mt-2">
        {figures.slice(3).map((f) => (
          <StatBox key={f.id} value={f.value} label={<span title={f.hint}>{f.label}</span>} />
        ))}
      </StatGrid>
      {figures.every((f) => !f.known) ? (
        <p className="y-micro y-fg-2 pt-2">Figures show once {business.name} has hired three times on Yapp.</p>
      ) : null}
      <div className="y-ord-person-actions">
        <PillButton variant="soft" icon={<MessageSquare size={16} aria-hidden />} onClick={ws.goToMessages}>
          Message
        </PillButton>
      </div>
    </Block>
  );
}
