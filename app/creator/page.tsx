"use client";

import { CalendarClock, Clock, Repeat2, Star } from "lucide-react";
import Link from "next/link";

import {
  LatestReview,
  MoneyBlock,
  NextStepBlock,
  type NextStep,
  OpportunityList,
  PitchPerformance,
  RepeatClients,
  repeatClients,
} from "@/components/creator/dashboard-blocks";
import { withinDays } from "@/components/creator/pitch-helpers";
import { StrengthList, StrengthMeter, profileChecklist, strengthScore } from "@/components/creator/profile-strength";
import { CommissionCard } from "@/components/domain/commission-card";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { Character } from "@/components/ui/character";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { Page, SectionLabel } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { AppShell } from "@/components/shell/app-shell";
import { commissionTotals } from "@/lib/selectors";
import { daysFromNow, dueLabel, money, plural, relativeDay, shortDate, timeAgo } from "@/lib/format";
import {
  businessById,
  commissionsForCreator,
  creatorEarnings,
  me,
  opportunities,
  pitchesForCreator,
  requestById,
  reviewsForCreator,
} from "@/lib/selectors";
import { ME, useDemo } from "@/lib/store";
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
  const pitches = pitchesForCreator(s);
  const shortlisted = pitches.filter((p) => p.status === "shortlisted");
  const earnings = creatorEarnings(s);
  const allOpps = opportunities(s);
  const freshOpps = allOpps.filter((o) => !o.pitch && !o.hidden);
  const clients = repeatClients(s);
  const checklist = profileChecklist(s, creator);
  const score = strengthScore(checklist);
  const review = reviewsForCreator(s, ME.creatorId)[0];

  /* ---------------------------------------------------- summary sentence */
  const parts: React.ReactNode[] = [];
  if (offers.length) parts.push(<strong key="o" className="y-strong">{plural(offers.length, "new offer")}</strong>);
  if (producing.length) {
    const days = daysFromNow(producing[0].dueDate);
    const when = days < 0 ? "overdue" : `due ${relativeDay(producing[0].dueDate)}`;
    parts.push(
      <strong key="d" className="y-strong">
        {producing.length === 1
          ? `1 delivery ${when}`
          : `${producing.length} deliveries due, the next ${days < 0 ? "overdue" : relativeDay(producing[0].dueDate)}`}
      </strong>,
    );
  }
  if (revisions.length)
    parts.push(<strong key="r" className="y-strong">{plural(revisions.length, "revision")} requested</strong>);
  const summary = parts.length
    ? parts.reduce<React.ReactNode[]>((acc, part, i) => {
        if (i === 0) return [part];
        return [...acc, i === parts.length - 1 ? " and " : ", ", part];
      }, [])
    : null;

  /* ------------------------------------------------------------ next step */
  let next: NextStep;
  if (offers[0]) {
    const c = offers[0];
    const business = businessById(s, c.businessId);
    const addonsTotal = commissionTotals(c).addonsTotal;
    next = {
      eyebrow: "New offer",
      title: `${business?.name ?? "A business"} wants ${plural(c.brief.videoCount, "video")} — ${money(c.price)}`,
      detail: `${c.title}.${addonsTotal ? ` Plus ${money(addonsTotal)} in add-ons.` : ""} Payment is secured before you start.`,
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

  const todo = [...checklist.filter((i) => !i.done), ...checklist.filter((i) => i.done)].slice(0, 5);

  return (
    <Page>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 [&>*]:min-w-0">
        {/* Greeting */}
        <Block tone="paper" pad="lg" className="flex flex-col justify-between gap-8 overflow-hidden lg:col-span-8">
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
          <div className="flex flex-col gap-4">
            <p className="y-display y-title max-w-[32ch] !font-normal xl:pe-40">
              <FaceAvatar id={creator.id} name={creator.name} size={34} className="me-2 -mt-1 align-middle" />
              {summary ? (
                <>You have {summary}.</>
              ) : (
                <>
                  Nothing urgent today. <strong className="y-strong">A good moment to pitch</strong> on
                  something new.
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {creator.available ? (
                <Badge tone="success" icon={<span aria-hidden className="size-2 rounded-full bg-current" />}>
                  Available for work
                </Badge>
              ) : (
                <Badge tone="warning" icon={<CalendarClock size={14} aria-hidden />}>
                  Away{creator.availableFrom ? ` until ${shortDate(creator.availableFrom)}` : ""}
                </Badge>
              )}
              <span className="y-chip">
                <Star size={14} aria-hidden className="fill-current" />
                <span className="y-num font-semibold">{creator.rating.toFixed(1)}</span>
                <span className="y-fg-2">rating · {creator.reviewCount}</span>
              </span>
              <span className="y-chip">
                <Clock size={14} aria-hidden />
                <span className="y-num font-semibold">{creator.onTimeRate}%</span>
                <span className="y-fg-2">on time</span>
              </span>
              <span className="y-chip">
                <Repeat2 size={14} aria-hidden />
                <span className="y-num font-semibold">{creator.repeatClientRate}%</span>
                <span className="y-fg-2">repeat clients</span>
              </span>
            </div>
          </div>
        </Block>

        <NextStepBlock step={next} className="lg:col-span-4" />
      </div>

      {/* Due soon */}
      <SectionLabel
        id="due-soon"
        action={
          <Link href="/creator/commissions" className="y-small y-link font-semibold">
            All commissions
          </Link>
        }
      >
        Due soon
      </SectionLabel>
      {dueSoon.length ? (
        <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3" aria-labelledby="due-soon">
          {dueSoon.slice(0, 3).map((c) => (
            <li key={c.id}>
              <CommissionCard commission={c} role="creator" className="h-full" />
            </li>
          ))}
        </ul>
      ) : (
        <Block tone="paper" pad="md" className="flex flex-wrap items-center justify-between gap-3">
          <p className="y-small y-fg-2">
            Nothing in production. Accept an offer or win a pitch and it lands here with its due date.
          </p>
          <PillButton href="/creator/opportunities" size="sm" variant="outline">
            Find work
          </PillButton>
        </Block>
      )}

      {/* Money and pitches */}
      <SectionLabel>Money and pitches</SectionLabel>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 [&>*]:min-w-0">
        <MoneyBlock
          className="lg:col-span-5"
          available={earnings.available}
          held={earnings.held}
          thisMonth={earnings.thisMonth}
          monthly={earnings.monthly}
          monthLabels={earnings.monthLabels}
        />
        <PitchPerformance className="lg:col-span-7" pitches={withinDays(pitches, 30)} />
      </div>

      {/* Opportunities and repeat clients */}
      <SectionLabel
        action={
          <Link href="/creator/opportunities" className="y-small y-link font-semibold">
            See all
          </Link>
        }
      >
        New opportunities for you
      </SectionLabel>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 [&>*]:min-w-0">
        <OpportunityList className="lg:col-span-7" items={freshOpps.slice(0, 3)} />
        <RepeatClients className="lg:col-span-5" clients={clients} rate={creator.repeatClientRate} />
      </div>

      {/* Profile */}
      <SectionLabel
        action={
          <Link href={`/creators/${creator.handle}`} className="y-small y-link font-semibold">
            View public profile
          </Link>
        }
      >
        Your profile
      </SectionLabel>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 [&>*]:min-w-0">
        <Block tone="paper" pad="md" className="flex flex-col gap-5 lg:col-span-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="y-head">Profile strength</h2>
              <p className="y-small y-fg-2">
                {score === 100
                  ? "Everything businesses look for is there."
                  : "Complete profiles get invited to more requests."}
              </p>
            </div>
            <span className="y-display y-num text-[44px] leading-none font-semibold tracking-[-0.04em]">
              {score}
              <span className="text-xl">%</span>
            </span>
          </div>
          <StrengthMeter value={score} label="Profile strength" />
          <StrengthList items={todo} />
          <PillButton href="/creator/profile" size="sm" variant="outline" className="w-fit">
            Manage profile
          </PillButton>
        </Block>
        <LatestReview className="lg:col-span-5" review={review} handle={creator.handle} />
      </div>
    </Page>
  );
}
