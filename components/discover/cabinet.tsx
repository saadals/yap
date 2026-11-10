"use client";

import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { LineChart } from "@/components/ui/charts";
import { CountUp } from "@/components/ui/count-up";
import { useReducedMotion } from "@/components/ui/motion";
import { Progress } from "@/components/ui/progress";
import { DeltaChip, SampleChip } from "@/components/ui/tags";
import { plural } from "@/lib/format";
import type { NicheId } from "@/lib/types";

import type { CategoryStat } from "./data";
import { SAMPLE_AD_RESULTS, SAMPLE_CAC, SAMPLE_INDEX, type AdMetricId } from "./sample";

/** The four files, front to back at rest. White and green alternate (Discover 4.3.3). */
const FILES = [
  { id: "cost", number: "01", name: "Cost savings", short: "Savings", tone: "paper" },
  { id: "index", number: "02", name: "Yapp index", short: "Index", tone: "neon" },
  { id: "hot", number: "03", name: "Hot categories", short: "Hot", tone: "paper" },
  { id: "ads", number: "04", name: "Ad results", short: "Ads", tone: "neon" },
] as const;
const COUNT = FILES.length;

/** Minimum time between two flips, and the quiet time that ends a wheel or trackpad gesture. */
const FLIP_GAP = 450;
const GESTURE_QUIET = 180;
const WHEEL_STEP = 40;
/** A horizontal swipe flips: |dx| ≥ 40px and clearly more sideways than up or down. */
const SWIPE_MIN = 40;

const mod = (n: number) => ((n % COUNT) + COUNT) % COUNT;

/**
 * The file cabinet: every key number in four files filed one behind another, only the front one
 * showing its content, each tab readable. Flip with the wheel or trackpad (one flip per gesture,
 * the page never scrolls under it), a sideways swipe on touch screens (an up or down swipe still
 * scrolls the page), the tabs, or ↑ / ↓ while focus is inside. It loops both ways. The front
 * file's charts, bars and count-ups play again each time it comes to the front.
 */
export function Cabinet({
  categories,
  onOpenMetric,
  onJumpCategory,
}: {
  categories: CategoryStat[];
  onOpenMetric: (id: AdMetricId) => void;
  onJumpCategory: (id: NicheId) => void;
}) {
  const reduced = useReducedMotion();
  const [front, setFront] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  /** Bumped whenever a file comes to the front, so its charts and numbers play again. */
  const [epoch, setEpoch] = useState(0);
  const [announce, setAnnounce] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lastFlip = useRef(-Infinity);
  const timers = useRef<number[]>([]);
  const latest = useRef({ front, reduced });
  useLayoutEffect(() => {
    latest.current = { front, reduced };
  });

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const show = (index: number, options: { focus?: boolean } = {}) => {
    setFront(index);
    setEpoch((n) => n + 1);
    setAnnounce(`File ${index + 1} of ${COUNT}, ${FILES[index].name}`);
    if (options.focus) tabRefs.current[index]?.focus({ preventScroll: true });
  };

  /** One step forward (1) or back (−1). False when it came too soon after the last flip. */
  const flip = (direction: 1 | -1, options: { focus?: boolean } = {}): boolean => {
    const now = performance.now();
    if (now - lastFlip.current < FLIP_GAP) return false;
    lastFlip.current = now;
    const { front: current, reduced: still } = latest.current;
    const next = mod(current + direction);
    if (options.focus) tabRefs.current[next]?.focus({ preventScroll: true });
    if (direction > 0 && !still) {
      // The front file drops away first, then everything re-files (Discover 4.3.3).
      setLeaving(current);
      timers.current.push(window.setTimeout(() => show(next), 160));
      timers.current.push(window.setTimeout(() => setLeaving(null), 420));
    } else {
      show(next);
    }
    return true;
  };
  const flipRef = useRef(flip);
  useLayoutEffect(() => {
    flipRef.current = flip;
  });

  // Wheel and trackpad: never scroll the page over the cabinet; sum the deltas of one gesture and
  // flip once. A flip refused by the minimum gap doesn't use the gesture up.
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    let sum = 0;
    let used = false;
    let quiet = 0;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
      const delta =
        (Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX) * scale;
      window.clearTimeout(quiet);
      quiet = window.setTimeout(() => {
        sum = 0;
        used = false;
      }, GESTURE_QUIET);
      if (used) return;
      sum += delta;
      if (Math.abs(sum) >= WHEEL_STEP) {
        if (flipRef.current(sum > 0 ? 1 : -1)) used = true;
        sum = 0;
      }
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      node.removeEventListener("wheel", onWheel);
      window.clearTimeout(quiet);
    };
  }, []);

  // Touch: a sideways swipe flips (left = next); up and down stay a page scroll (touch-action: pan-y).
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (event: React.TouchEvent) => {
    const t = event.touches[0];
    touch.current = event.touches.length === 1 && t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    const t = event.changedTouches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.2) flip(dx < 0 ? 1 : -1);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const onTab = event.target instanceof HTMLElement && event.target.getAttribute("role") === "tab";
    if (event.key === "ArrowDown" || (onTab && event.key === "ArrowRight")) {
      event.preventDefault();
      if (onTab && event.key === "ArrowRight") show(mod(front + 1), { focus: true });
      else flip(1, { focus: true });
    } else if (event.key === "ArrowUp" || (onTab && event.key === "ArrowLeft")) {
      event.preventDefault();
      if (onTab && event.key === "ArrowLeft") show(mod(front - 1), { focus: true });
      else flip(-1, { focus: true });
    } else if (onTab && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      show(event.key === "Home" ? 0 : COUNT - 1, { focus: true });
    }
  };

  const depth = (index: number) => mod(index - front);
  const layer = (index: number) =>
    ({ "--k": depth(index), zIndex: 10 - depth(index) }) as React.CSSProperties;

  return (
    <div
      ref={rootRef}
      className="y-dsc-cab"
      role="region"
      aria-label="Yapp numbers"
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div role="tablist" aria-label="Files" className="y-dsc-cab-tabs">
        {FILES.map((file, index) => {
          const isFront = index === front;
          return (
            <div
              key={file.id}
              className="y-dsc-file-layer"
              data-i={index}
              data-tone={file.tone}
              data-front={isFront ? "true" : undefined}
              data-leaving={leaving === index ? "true" : undefined}
              style={layer(index)}
            >
              <button
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`dsc-tab-${file.id}`}
                aria-selected={isFront}
                aria-controls={`dsc-file-${file.id}`}
                tabIndex={isFront ? 0 : -1}
                className="y-dsc-tab"
                onClick={() => {
                  if (!isFront) show(index);
                }}
              >
                {isFront ? <span aria-hidden className="y-dsc-tab-dot" /> : null}
                <span className="y-dsc-tab-long">
                  {file.number} · {file.name}
                </span>
                <span aria-hidden className="y-dsc-tab-short">
                  {file.number} · {file.short}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {FILES.map((file, index) => {
        const isFront = index === front;
        const key = isFront ? `on-${epoch}` : "off";
        return (
          <div
            key={file.id}
            id={`dsc-file-${file.id}`}
            role="tabpanel"
            aria-labelledby={`dsc-tab-${file.id}`}
            className="y-dsc-file"
            data-i={index}
            data-tone={file.tone}
            data-front={isFront ? "true" : undefined}
            data-leaving={leaving === index ? "true" : undefined}
            style={layer(index)}
            inert={!isFront}
          >
            <div className="y-dsc-file-body" key={key}>
              {file.id === "cost" ? (
                <CostFile />
              ) : file.id === "index" ? (
                <IndexFile />
              ) : file.id === "hot" ? (
                <HotFile categories={categories} onJump={onJumpCategory} />
              ) : (
                <AdsFile onOpen={onOpenMetric} />
              )}
            </div>
          </div>
        );
      })}

      <div className="y-dsc-cab-foot">
        <span className="y-num text-(--y-ink)" aria-hidden>
          {String(front + 1).padStart(2, "0")} / {String(COUNT).padStart(2, "0")}
        </span>
        <span className="y-dsc-cab-hint" data-for="pointer">
          Scroll or swipe inside to flip · loops
        </span>
        <span className="y-dsc-cab-hint" data-for="touch">
          Swipe sideways to flip · loops
        </span>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------- files */

function FileTop({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <div className="y-dsc-file-top">
      <h3 className="y-dsc-file-t">{title}</h3>
      {aside ? <div className="flex flex-none items-center gap-2">{aside}</div> : null}
    </div>
  );
}

function CostFile() {
  const c = SAMPLE_CAC;
  return (
    <>
      <FileTop
        title="Customer acquisition cost"
        aside={
          <>
            <SampleChip />
            <span className="y-dsc-chipmeta">Monthly</span>
          </>
        }
      />
      <div className="y-dsc-kpi-row">
        <span className="y-dsc-kpi">
          <CountUp value={c.dropPct} format={(n) => `−${Math.round(n)}%`} />
          <ArrowDownRight aria-hidden className="y-dsc-kpi-ar" />
        </span>
        <span className="y-dsc-kpi-side">
          <span className="y-dsc-meta">
            <b>${c.yapp}</b> on Yapp · <b>${c.typical}</b> typical
          </span>
          <DeltaChip direction="down" good>
            Saving ${c.savingPerCustomer} per customer
          </DeltaChip>
        </span>
      </div>
      <LineChart
        className="y-dsc-file-chart"
        values={[...c.yappSeries]}
        compare={[...c.typicalSeries]}
        labels={[...c.months]}
        axis={c.months.map((m) => m.toUpperCase())}
        format={(n) => `$${Math.round(n)}`}
        unit="CAC"
        height="var(--dsc-chart-h)"
        legend={{ value: "Brands on Yapp", compare: "Typical paid social" }}
        label={`Sample: customer acquisition cost on Yapp fell from $${c.yappSeries[0]} to $${c.yapp} between May and November, against about $${c.typical} for typical paid social.`}
      />
    </>
  );
}

function IndexFile() {
  const x = SAMPLE_INDEX;
  return (
    <>
      <FileTop
        title="Traded on Yapp"
        aside={
          <>
            <SampleChip />
            <span className="y-dsc-meta">Since {x.since}</span>
          </>
        }
      />
      <div className="y-dsc-kpi-row">
        <span className="y-dsc-kpi">
          <CountUp value={x.tradedMillions} format={(n) => `$${n.toFixed(1)}`} />
          <small>M</small>
          <ArrowUpRight aria-hidden className="y-dsc-kpi-ar" />
        </span>
        <span className="y-dsc-kpi-side">
          <span className="y-dsc-meta">in just {x.months} months</span>
          <DeltaChip direction="up">{x.monthOverMonthPct}% month over month</DeltaChip>
        </span>
      </div>
      <LineChart
        className="y-dsc-file-chart"
        values={[...x.series]}
        labels={[...x.labels]}
        axis={x.labels.map((m) => m.toUpperCase())}
        format={(n) => `$${n.toFixed(1)}M`}
        unit="total"
        height="var(--dsc-chart-h)"
        label={`Sample: money traded on Yapp grew from $${x.series[0]}M in April to $${x.tradedMillions}M in October.`}
      />
      <div className="y-dsc-file-foot">
        <span>
          <b>${x.paidOutMillions}M</b> paid out to creators
        </span>
        <span>
          <b>{x.yappsDelivered}</b> Yapps delivered
        </span>
      </div>
    </>
  );
}

function HotFile({ categories, onJump }: { categories: CategoryStat[]; onJump: (id: NicheId) => void }) {
  const top = Math.max(1, ...categories.map((c) => c.orders));
  return (
    <>
      <FileTop title="Hottest categories" aside={<span className="y-dsc-meta">Orders, last 30 days</span>} />
      <ol className="y-dsc-hot">
        {categories.map((category, rank) => (
          <li key={category.id}>
            <button
              type="button"
              className="y-dsc-hot-row"
              onClick={() => onJump(category.id)}
              aria-label={`${rank + 1}. ${category.name}: ${plural(category.orders, "order")} in the last 30 days. Show its creators`}
            >
              <span className="y-dsc-hot-rank y-num">{rank + 1}</span>
              <span className="y-dsc-hot-name" title={category.name}>
                {category.name}
              </span>
              <Progress value={category.orders / top} tone="gradient" />
              <span className="y-dsc-hot-v y-num">{category.orders}</span>
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}

function AdsFile({ onOpen }: { onOpen: (id: AdMetricId) => void }) {
  return (
    <>
      <FileTop title="Yapp ads vs. typical paid social" aside={<SampleChip />} />
      <ul className="y-dsc-ads">
        {SAMPLE_AD_RESULTS.map((metric) => (
          <li key={metric.id}>
            <button type="button" className="y-dsc-ad" onClick={() => onOpen(metric.id)}>
              <span className="y-dsc-ad-ic" aria-hidden>
                {metric.short}
              </span>
              <span className="min-w-0">
                <span className="y-dsc-ad-t">{metric.name}</span>
                <span className="y-dsc-ad-s">
                  <b>{metric.yapp}</b> on Yapp · {metric.typical} typical
                </span>
              </span>
              <Progress value={metric.improvementPct / 100} tone="ink" className="y-dsc-ad-track" />
              <span className="y-dsc-ad-v">
                <b className="y-num">{metric.big}</b>
                <span>
                  ahead {metric.monthsAhead}/{metric.ofMonths} mo
                </span>
              </span>
              <ChevronRight size={14} aria-hidden className="y-dsc-chev y-dsc-ad-chev" />
            </button>
          </li>
        ))}
      </ul>
      <p className="y-dsc-ads-note">
        Same brands, same period: Yapp creatives against their other ads. Choose a row for the
        12-month trend.
      </p>
    </>
  );
}
