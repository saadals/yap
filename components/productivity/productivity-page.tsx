"use client";

import { BarChart3, Download } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { downloadFile, toCsv } from "@/components/money/kpi";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { WidePage } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { SelectPill } from "@/components/ui/select-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { paths } from "@/lib/paths";
import {
  DEFAULT_RANGE,
  PRODUCTIVITY_RANGES,
  isRangeId,
  productivityCsvRows,
  productivityFileName,
  productivityReport,
  productivitySides,
  resolveSide,
  type Figure,
  type ProductivityReport,
  type ProductivitySide,
  type RangeId,
} from "@/lib/productivity";
import { me } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

import { BrandWorkCard, MoneyLine, PitchFunnelCard, TrendCard } from "./blocks";
import { AdMetricsCard, FigureCard, FigureSheet } from "./figures";
import { BrandSheet, BrandsCard, CreatorSheet, CreatorsCard } from "./people";

const TITLES: Record<ProductivitySide, string> = {
  brand: "How your Yapps are performing",
  creator: "How your work is performing",
};

/**
 * Productivity (Site-wide spec 5.9, round 3 answers items 17 and 36): figures the platform can
 * compute, for the side the account is looking from. About five blocks: the KPI strip, the trend,
 * how the work is going, the people, and one money line that points to Billing or Wallet.
 */
export function ProductivityPage() {
  const s = useDemo();
  const hydrated = useHydrated();
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [figure, setFigure] = useState<Figure | null>(null);
  const [person, setPerson] = useState<string | null>(null);

  if (!hydrated) return <ProductivitySkeleton />;

  const sides = productivitySides(s);
  const side = resolveSide(s, params.get("as"));
  const wantedRange = params.get("range");
  const range: RangeId = isRangeId(wantedRange) ? wantedRange : DEFAULT_RANGE;
  const report = productivityReport(s, side, range);

  const setQuery = (next: { as?: ProductivitySide; range?: RangeId }) => {
    const query = new URLSearchParams(params.toString());
    if (next.as) query.set("as", next.as);
    if (next.range) {
      if (next.range === DEFAULT_RANGE) query.delete("range");
      else query.set("range", next.range);
    }
    const text = query.toString();
    setPerson(null);
    router.replace(`${paths.productivity}${text ? `?${text}` : ""}`, { scroll: false });
  };

  const exportCsv = () => {
    const name = productivityFileName(report);
    downloadFile(name, toCsv(productivityCsvRows(report)));
    toast({ message: `Downloaded ${name}`, tone: "success" });
  };

  const tools = report.hasHistory ? (
    <div className="y-pd-tools">
      <SelectPill
        label="Date range"
        size="sm"
        value={range}
        onChange={(event) => setQuery({ range: event.target.value as RangeId })}
        options={PRODUCTIVITY_RANGES.map((r) => ({ value: r.id, label: r.label }))}
      />
      <PillButton variant="soft" size="sm" icon={<Download size={16} aria-hidden />} onClick={exportCsv}>
        Export
      </PillButton>
    </div>
  ) : null;

  const toggle =
    sides.length > 1 ? (
      <SegmentedToggle
        label="View as"
        size="md"
        fill
        value={side}
        onChange={(value) => setQuery({ as: value })}
        options={[
          { value: "brand" as const, label: "As a brand" },
          { value: "creator" as const, label: "As a creator" },
        ]}
      />
    ) : null;

  return (
    <WidePage className="y-pd">
      <header className="y-pd-head">
        <div className="y-sechead-l">
          <span className="y-eyebrow">Productivity</span>
          <h1 className="y-display y-title">{TITLES[report.side]}</h1>
        </div>
        {toggle ? null : tools}
      </header>
      {toggle ? (
        <div className="y-pd-bar">
          {toggle}
          {tools}
        </div>
      ) : null}

      {report.hasHistory ? (
        <Body report={report} onFigure={setFigure} onPerson={setPerson} />
      ) : (
        <NoHistory report={report} />
      )}

      <FigureSheet figure={figure} period={report.period} onClose={() => setFigure(null)} />
      {report.side === "brand" ? (
        <CreatorSheet
          row={report.people.find((row) => row.creator.id === person)}
          period={report.period}
          onClose={() => setPerson(null)}
        />
      ) : (
        <BrandSheet
          row={report.people.find((row) => row.business.id === person)}
          period={report.period}
          onClose={() => setPerson(null)}
        />
      )}
    </WidePage>
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
    <div className="y-pd-body">
      <section className="y-pd-kpis" aria-label={`Key figures, ${report.period.label.toLowerCase()}`}>
        {report.kpis.map((figure, index) => (
          <FigureCard key={figure.id} figure={figure} hero={index === 0} onOpen={onFigure} />
        ))}
        <AdMetricsCard metrics={report.adMetrics} side={report.side} />
      </section>
      <div className="y-pd-grid">
        <TrendCard report={report} />
        {report.side === "brand" ? (
          <BrandWorkCard report={report} onOpen={onFigure} />
        ) : (
          <PitchFunnelCard report={report} onOpen={onFigure} />
        )}
      </div>
      {report.side === "brand" ? (
        <CreatorsCard report={report} onOpen={onPerson} />
      ) : (
        <BrandsCard report={report} onOpen={onPerson} />
      )}
      <MoneyLine report={report} />
    </div>
  );
}

/** A side with no history at all: one start, not a page of empty figures. */
function NoHistory({ report }: { report: ProductivityReport }) {
  const s = useDemo();
  const name = me.business(s)?.name;
  return (
    <Block tone="paper" pad="lg" className="y-pd-none">
      {report.side === "brand" ? (
        <EmptyState
          icon={<BarChart3 size={22} aria-hidden />}
          title="Nothing ordered yet"
          body={`When you order${name ? ` as ${name}` : ""}, your spend, the videos you approve and the creators you work with show up here.`}
          action={
            <PillButton href={paths.newOrder()} variant="neon" arrow>
              Start an order
            </PillButton>
          }
        />
      ) : (
        <EmptyState
          icon={<BarChart3 size={22} aria-hidden />}
          title="Nothing made yet"
          body="Pitch on a custom order or pick a campaign slot. Your earnings and the brands you work with show up here."
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
    <WidePage className="y-pd">
      <div className="y-pd-head" aria-hidden>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-72 max-w-full" />
        </div>
      </div>
      <div className="y-pd-body" aria-hidden>
        <div className="y-pd-kpis">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="y-pd-kpi" data-hero={index === 0 ? "true" : undefined} data-wide={index === 5 ? "true" : undefined}>
              <Skeleton className="h-[150px] w-full !rounded-(--y-r-block)" />
            </div>
          ))}
        </div>
        <div className="y-pd-grid">
          <Skeleton className="h-[340px] w-full !rounded-(--y-r-block)" />
          <Skeleton className="h-[340px] w-full !rounded-(--y-r-block)" />
        </div>
      </div>
    </WidePage>
  );
}
