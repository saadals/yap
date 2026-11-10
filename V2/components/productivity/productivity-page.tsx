"use client";

import { ArrowLeftRight, ChartNoAxesColumn, Download } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { downloadFile, toCsv } from "@/components/billing/csv";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { moneyExact } from "@/lib/format";
import { modeLabel, rememberMode, useMode, type Mode } from "@/lib/mode";
import { paths } from "@/lib/paths";
import {
  DEFAULT_RANGE,
  PRODUCTIVITY_RANGES,
  isRangeId,
  isSide,
  productivityCsvRows,
  productivityFileName,
  productivityReport,
  productivitySides,
  type Figure,
  type ProductivityReport,
  type ProductivitySide,
  type RangeId,
} from "@/lib/productivity";
import { me } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

import { AdMetricsLine, FigureSheet, FigureTile } from "./figures";
import { LineChart } from "./line-chart";
import { BrandSheet, BrandsSection, CreatorSheet, CreatorsSection } from "./people";
import { MoneyCard, PitchesCard, SpeedCard } from "./side-cards";

const modeOfSide = (side: ProductivitySide): Mode => (side === "creator" ? "studio" : "order");

const COPY: Record<ProductivitySide, { title: string; description: (name: string) => string }> = {
  brand: {
    title: "How your orders are going",
    description: (name) => `What you spent as ${name}, the videos you got and how creators delivered. From your orders on Yapp only.`,
  },
  creator: {
    title: "How your work is going",
    description: () => "What you earned, the videos you made, and how your pitches and deliveries landed. From your work on Yapp only.",
  },
};

/**
 * /productivity: figures the platform can compute, for one side. The side follows the tab's mode
 * (Ordering: brand figures; Studio: creator figures); `?as=` names a side explicitly and the tab
 * takes that side's mode, so the header and the figures always agree. An account without a
 * creator profile only has the brand side. `?range=` picks the period.
 *
 * Calm on purpose: the range, five figure tiles, one chart, the people you worked with, one card of
 * how things move (or your pitches) and one money line that points to Billing or Earnings.
 * Uses `useSearchParams`: render inside <Suspense>.
 */
export function ProductivityPage() {
  const s = useDemo();
  const hydrated = useHydrated();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const account = me.account(s);
  const tabMode = useMode(account, pathname);
  const [figure, setFigure] = useState<Figure | null>(null);
  const [person, setPerson] = useState<string | null>(null);

  const sides = productivitySides(s);
  const asParam = params.get("as");
  const asked = isSide(asParam) && sides.includes(asParam) ? asParam : undefined;
  const side: ProductivitySide = asked ?? (tabMode === "studio" && sides.includes("creator") ? "creator" : "brand");
  const wantedRange = params.get("range");
  const range: RangeId = isRangeId(wantedRange) ? wantedRange : DEFAULT_RANGE;

  // The shell keeps the tab's mode; make it the mode of the side shown (an explicit `?as=`, or the
  // brand side of an account with no creator profile). Writes session storage, not React state.
  const shownMode = modeOfSide(side);
  useEffect(() => {
    if (hydrated && tabMode !== shownMode) rememberMode(account.id, shownMode);
  }, [hydrated, tabMode, shownMode, account.id]);

  if (!hydrated) return <ProductivitySkeleton />;

  const report = productivityReport(s, side, range);
  const otherSide = sides.find((x) => x !== side);

  const go = (next: { as?: ProductivitySide; range?: RangeId }) => {
    const nextRange = next.range ?? range;
    setPerson(null);
    router.replace(paths.productivity({ as: next.as ?? side, range: nextRange === DEFAULT_RANGE ? undefined : nextRange }), {
      scroll: false,
    });
  };

  const exportCsv = () => {
    const name = productivityFileName(report);
    downloadFile(name, toCsv(productivityCsvRows(report)));
    toast({ message: `Downloaded ${name}`, tone: "success" });
  };

  const name = report.side === "brand" ? report.business.name : report.creator.name;

  return (
    <Page>
      <PageHeader
        eyebrow="Productivity"
        title={COPY[side].title}
        description={COPY[side].description(name)}
        actions={
          report.hasHistory ? (
            <PillButton variant="soft" icon={<Download size={17} aria-hidden />} onClick={exportCsv}>
              Export CSV
            </PillButton>
          ) : null
        }
      />

      {report.hasHistory ? (
        <>
          <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <SegmentedToggle
              label="Period"
              value={range}
              onChange={(value) => go({ range: value })}
              options={PRODUCTIVITY_RANGES.map((r) => ({ value: r.id, label: r.short }))}
              fill
              className="sm:w-auto"
            />
            {otherSide ? <SideLink side={otherSide} range={range} /> : null}
          </div>
          <Body report={report} onFigure={setFigure} onPerson={setPerson} />
        </>
      ) : (
        <>
          <NoHistory report={report} />
          {otherSide ? (
            <div className="pt-4">
              <SideLink side={otherSide} range={range} />
            </div>
          ) : null}
        </>
      )}

      <FigureSheet figure={figure} period={report.period} onClose={() => setFigure(null)} />
      {report.side === "brand" ? (
        <CreatorSheet row={report.people.find((row) => row.creator.id === person)} period={report.period} onClose={() => setPerson(null)} />
      ) : (
        <BrandSheet row={report.people.find((row) => row.business.id === person)} period={report.period} onClose={() => setPerson(null)} />
      )}
    </Page>
  );
}

/** The quiet way to the other side's figures, for accounts that both order and make. */
function SideLink({ side, range }: { side: ProductivitySide; range: RangeId }) {
  return (
    <Link
      href={paths.productivity({ as: side, range: range === DEFAULT_RANGE ? undefined : range })}
      scroll={false}
      className="y-small y-fg-2 inline-flex w-fit items-center gap-1.5 font-medium hover:text-(--y-ink)"
    >
      <ArrowLeftRight size={15} aria-hidden />
      See your {side === "creator" ? modeLabel.studio : modeLabel.order.toLowerCase()} figures
    </Link>
  );
}

function Body({
  report,
  onFigure,
  onPerson,
}: {
  report: ProductivityReport;
  onFigure: (figure: Figure) => void;
  onPerson: (key: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <section aria-label={`Key figures, ${report.period.label.toLowerCase()}`} className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-5">
        {report.kpis.map((figure, index) => (
          <FigureTile key={figure.id} figure={figure} onOpen={onFigure} className={index === 0 ? "max-md:col-span-2" : ""} />
        ))}
      </section>
      <div className="pt-3">
        <AdMetricsLine metrics={report.adMetrics} side={report.side} />
      </div>

      <div className="grid grid-cols-1 gap-x-6 pt-6 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col lg:col-span-8">
          <TrendCard report={report} />
          {report.side === "brand" ? (
            <CreatorsSection report={report} onOpen={onPerson} />
          ) : (
            <BrandsSection report={report} onOpen={onPerson} />
          )}
        </div>
        <aside aria-label="More figures" className="flex min-w-0 flex-col gap-3 pt-8 lg:col-span-4 lg:pt-0">
          {report.side === "brand" ? <SpeedCard report={report} onOpen={onFigure} /> : <PitchesCard report={report} onOpen={onFigure} />}
          <MoneyCard report={report} />
        </aside>
      </div>
    </div>
  );
}

/** The hero figure over the period as a running total, against the previous period at the same point. */
function TrendCard({ report }: { report: ProductivityReport }) {
  const { period, series } = report;
  const hero = report.kpis[0];
  const what = report.side === "brand" ? "spend" : "earnings";
  const empty = series.values.every((v) => v === 0) && series.compare.every((v) => v === 0);
  const previousTotal = series.compare[series.compare.length - 1] ?? 0;
  return (
    <Block as="section" tone="paper" pad="md" className="flex flex-col gap-4" aria-labelledby="pd-trend-t">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="pd-trend-t" className="y-head">
          {report.side === "brand" ? "Spend over time" : "Earnings over time"}
        </h2>
        <span className="y-small y-fg-2 y-num">
          {hero.display} · {moneyExact(previousTotal)} the {period.compareLabel}
        </span>
      </div>
      {empty ? (
        <p className="y-small y-fg-2 py-8 text-center">
          No {what} released in the {period.label.toLowerCase()} or the {period.compareLabel}. Try a longer range.
        </p>
      ) : (
        <LineChart
          values={series.values}
          compare={series.compare}
          labels={series.labels}
          axis={series.axis}
          format={(n) => moneyExact(n)}
          legend={{ value: period.label, compare: `The ${period.compareLabel}` }}
          label={`${hero.label}: ${hero.display} in the ${period.label.toLowerCase()}, against ${moneyExact(previousTotal)} in the ${period.compareLabel}.`}
        />
      )}
    </Block>
  );
}

/** A side with no history at all: one start, not a page of empty figures. */
function NoHistory({ report }: { report: ProductivityReport }) {
  return (
    <Block tone="paper" pad="md">
      {report.side === "brand" ? (
        <EmptyState
          icon={<ChartNoAxesColumn size={22} aria-hidden />}
          title="Nothing ordered yet"
          body={`When you order as ${report.business.name}, what you spend, the videos you approve and the creators you work with show up here.`}
          action={
            <PillButton href={paths.newOrder()} variant="neon" arrow>
              Start an order
            </PillButton>
          }
        />
      ) : (
        <EmptyState
          icon={<ChartNoAxesColumn size={22} aria-hidden />}
          title="Nothing made yet"
          body="Pitch on a custom order or pick a campaign slot. What you earn and the brands you work with show up here."
          action={
            <PillButton href={paths.findWork()} variant="neon" arrow>
              Find work
            </PillButton>
          }
        />
      )}
    </Block>
  );
}

export function ProductivitySkeleton() {
  return (
    <Page>
      <div aria-busy="true" aria-label="Loading productivity" className="flex flex-col gap-3 pb-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div aria-hidden className="flex flex-col gap-3">
        <Skeleton className="h-10 w-80 max-w-full !rounded-full" />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className={`h-[124px] w-full !rounded-(--y-r-block) ${index === 0 ? "max-md:col-span-2" : ""}`} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 pt-6 lg:grid-cols-12">
          <Skeleton className="h-[300px] w-full !rounded-(--y-r-block) lg:col-span-8" />
          <Skeleton className="h-[300px] w-full !rounded-(--y-r-block) lg:col-span-4" />
        </div>
      </div>
    </Page>
  );
}
