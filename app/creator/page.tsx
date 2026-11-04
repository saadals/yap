"use client";

import { DueSoon, MoneyBlock, NextStepBlock, type NextStep, OpportunityList } from "@/components/creator/dashboard-blocks";
import { Block } from "@/components/ui/block";
import { Character } from "@/components/ui/character";
import { Page } from "@/components/ui/page";
import { AppShell } from "@/components/shell/app-shell";
import { daysFromNow, dueLabel, money, plural, relativeDay, shortDate, timeAgo } from "@/lib/format";
import {
  businessById,
  commissionTotals,
  commissionsForCreator,
  creatorEarnings,
  me,
  opportunities,
  pitchesForCreator,
  requestById,
} from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import type { Commission } from "@/lib/types";

export default function CreatorHome() {
  return (
    <AppShell role="creator">
      <Dashboard />
    </AppShell>
  );
}

const byDue = (a: Commission, b: Commission) => Date.parse(a.dueDate) - Date.parse(b.dueDate);

function Dashboard() {
  const s = useDemo();
  const creator = me.creator(s);
  const commissions = commissionsForCreator(s);
  const offers = commissions
    .filter((c) => c.status === "offered")
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const revisions = commissions.filter((c) => c.status === "revision").sort(byDue);
  const producing = commissions.filter((c) => c.status === "in_progress").sort(byDue);
  const dueSoon = commissions
    .filter((c) => c.status === "in_progress" || c.status === "revision" || c.status === "delivered" || c.status === "disputed")
    .sort(byDue);
  const shortlisted = pitchesForCreator(s).filter((p) => p.status === "shortlisted");
  const earnings = creatorEarnings(s);
  const freshOpps = opportunities(s).filter((o) => !o.pitch && !o.hidden);

  /* ---------------------------------------------------- summary sentence */
  const parts: string[] = [];
  if (offers.length) parts.push(plural(offers.length, "new offer"));
  if (producing.length) {
    const days = daysFromNow(producing[0].dueDate);
    const when = days < 0 ? "overdue" : `due ${relativeDay(producing[0].dueDate)}`;
    parts.push(
      producing.length === 1
        ? `1 delivery ${when}`
        : `${producing.length} deliveries due, the next ${days < 0 ? "overdue" : relativeDay(producing[0].dueDate)}`,
    );
  }
  if (revisions.length) parts.push(`${plural(revisions.length, "revision")} requested`);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
  const away = creator.available
    ? ""
    : ` You're away${creator.availableFrom ? ` until ${shortDate(creator.availableFrom)}` : ""}.`;
  const summary = (list ? `You have ${list}.` : "Nothing urgent today. A good moment to pitch on something new.") + away;

  /* ------------------------------------------------------------ next step */
  let next: NextStep;
  if (offers[0]) {
    const c = offers[0];
    const business = businessById(s, c.businessId);
    const addonsTotal = commissionTotals(c).addonsTotal;
    next = {
      eyebrow: "New offer",
      title: `${business?.name ?? "A business"} wants ${plural(c.brief.videoCount, "video")} — ${money(c.price)}`,
      detail: `${c.title}.${addonsTotal ? ` Plus ${money(addonsTotal)} in add-ons.` : ""}`,
      chip: `Sent ${timeAgo(c.createdAt)}`,
      cta: "Review the offer",
      href: `/creator/commissions/${c.id}`,
    };
  } else if (revisions[0]) {
    const c = revisions[0];
    const business = businessById(s, c.businessId);
    next = {
      eyebrow: "Changes requested",
      title: `${business?.name ?? "Your client"} asked for changes`,
      detail: c.title,
      chip: dueLabel(c.dueDate).text,
      cta: "See their notes",
      href: `/creator/commissions/${c.id}`,
    };
  } else if (producing[0]) {
    const c = producing[0];
    const business = businessById(s, c.businessId);
    next = {
      eyebrow: "Next delivery",
      title: `Deliver to ${business?.name ?? "your client"}`,
      detail: c.title,
      chip: dueLabel(c.dueDate).text,
      cta: "Open the commission",
      href: `/creator/commissions/${c.id}`,
    };
  } else if (shortlisted[0]) {
    const p = shortlisted[0];
    const request = requestById(s, p.requestId);
    const business = request ? businessById(s, request.businessId) : undefined;
    next = {
      eyebrow: "Shortlisted",
      title: `You're on ${business?.name ?? "a"}'s shortlist`,
      detail: request?.title ?? "Your pitch made the cut.",
      cta: "View your pitch",
      href: `/creator/opportunities/${p.requestId}`,
    };
  } else {
    next = {
      eyebrow: "Next step",
      title: "Find your next request",
      detail: `${plural(freshOpps.length, "open request")} you haven't pitched on yet.`,
      cta: "Browse opportunities",
      href: "/creator/opportunities",
    };
  }

  return (
    <Page>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 [&>*]:min-w-0">
        {/* Greeting */}
        <Block tone="paper" pad="lg" className="flex flex-col justify-between gap-6 overflow-hidden lg:col-span-8">
          <Character
            shape="dome"
            tint="violet"
            face="smile"
            className="absolute end-10 -bottom-3 hidden h-32 w-auto xl:block"
          />
          <h1 className="y-display y-t-display md:!text-[64px] xl:!text-[76px]">
            Good morning,
            <br />
            <span className="y-strong">{creator.firstName}</span>
          </h1>
          <p className="y-lead y-fg-2 max-w-[48ch]">{summary}</p>
        </Block>

        <NextStepBlock step={next} className="lg:col-span-4" />

        <DueSoon items={dueSoon.slice(0, 3)} className="lg:col-span-8" />

        {/* Spans two rows so it sits beside both lists and nothing stacks under it. */}
        <MoneyBlock
          available={earnings.available}
          held={earnings.held}
          className="self-start lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-2"
        />

        <OpportunityList className="lg:col-span-8" items={freshOpps.slice(0, 3)} />
      </div>
    </Page>
  );
}
