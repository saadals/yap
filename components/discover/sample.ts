/**
 * Discover's sample figures, in one place (round 3 answers, item 44). The app can't compute any of
 * these: they need connected ad accounts, platform-wide history or audience data that the
 * prototype doesn't have. Everything here is shown with the kit's `SampleChip`, on every screen
 * size, and none of it ships to production.
 *
 * What is real on Discover (and so is NOT here): Live briefs, the ticker, the hot categories, the
 * creators in each category panel, the reviews and the rating summary, the brand band.
 */

import { hashString } from "@/lib/hash";

/* ------------------------------------------------------------------ helpers */

/** Small deterministic generator (mulberry32), so a creator's sample figures never change. */
function seeded(key: string) {
  let a = hashString(key) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function series(rand: () => number, count: number, start: number, drift: number, noise: number) {
  const out: number[] = [];
  let value = start;
  for (let index = 0; index < count; index++) {
    value = Math.max(0.1, value + drift + (rand() - 0.5) * noise);
    out.push(value);
  }
  return out;
}

/* ------------------------------------------------------------ cabinet file 1 */

/** "Customer acquisition cost": brands on Yapp against typical paid social, May to November. */
export const SAMPLE_CAC = {
  yapp: 38,
  typical: 56,
  /** Shown as "−32%". */
  dropPct: 32,
  savingPerCustomer: 18,
  months: ["May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"],
  yappSeries: [55, 52, 48, 45, 42, 40, 38],
  typicalSeries: [56, 57, 55, 56, 58, 56, 56],
} as const;

/* ------------------------------------------------------------ cabinet file 2 */

/** "Traded on Yapp": the Yapp index, cumulative, in millions of dollars. */
export const SAMPLE_INDEX = {
  tradedMillions: 15.2,
  since: "April",
  months: 7,
  monthOverMonthPct: 41,
  paidOutMillions: 9.8,
  yappsDelivered: "48K",
  labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
  series: [0.4, 1.1, 2.3, 4.0, 6.6, 10.4, 15.2],
} as const;

/* ------------------------------------------------------------ cabinet file 4 */

export type AdMetricId = "ctr" | "hook" | "cost";

export type AdMetric = {
  id: AdMetricId;
  /** In the icon square. */
  short: string;
  /** The row title and the side panel's eyebrow. */
  name: string;
  /** The side panel's title. */
  title: string;
  yapp: string;
  typical: string;
  /** "+44%", "−76%". */
  big: string;
  /** How far ahead, as the bar's fill (0–100). */
  improvementPct: number;
  monthsAhead: number;
  ofMonths: number;
  /** 12 months, Dec to Nov. */
  yappSeries: number[];
  typicalSeries: number[];
  unit: "pct" | "money";
};

const adRand = seeded("discover:ad-results");

export const SAMPLE_AD_RESULTS: AdMetric[] = [
  {
    id: "ctr",
    short: "CTR",
    name: "Click-through rate",
    title: "CTR",
    yapp: "2.3%",
    typical: "1.6%",
    big: "+44%",
    improvementPct: 44,
    monthsAhead: 12,
    ofMonths: 12,
    yappSeries: series(adRand, 12, 1.8, 0.05, 0.15),
    typicalSeries: series(adRand, 12, 1.6, 0, 0.1),
    unit: "pct",
  },
  {
    id: "hook",
    short: "Hook",
    name: "Hook rate (first 3 sec)",
    title: "Hook rate",
    yapp: "31%",
    typical: "23%",
    big: "+8 pts",
    improvementPct: 35,
    monthsAhead: 11,
    ofMonths: 12,
    yappSeries: series(adRand, 12, 26, 0.45, 1.6),
    typicalSeries: series(adRand, 12, 23, 0, 1),
    unit: "pct",
  },
  {
    id: "cost",
    short: "$/vid",
    name: "Cost per video vs. agency",
    title: "Cost per video",
    yapp: "$149",
    typical: "$620",
    big: "−76%",
    improvementPct: 76,
    monthsAhead: 12,
    ofMonths: 12,
    yappSeries: series(adRand, 12, 170, -1.8, 6),
    typicalSeries: series(adRand, 12, 610, 1, 15),
    unit: "money",
  },
];

export const SAMPLE_MONTHS_12 = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];

/** The metric view's two boxes after "months ahead". */
export const SAMPLE_MEASURED = { campaigns: "1,240", adSpend: "$8.4M" } as const;

/* --------------------------------------------------------- success stories */

export type SampleStory = {
  id: string;
  /** A seed brand (invented names only). */
  businessId: string;
  title: string;
  /** The first is the headline result on the card. */
  results: { value: string; label: string }[];
  weeks: number;
  yapps: number;
  adSpend: string;
  /** Six weeks of the headline metric, before Yapp and after. */
  before: number[];
  after: number[];
  /** For the chart's read-out. */
  unit: "index" | "money";
  quote: string;
  quoteBy: string;
  /** "Hook A–C" CTRs on the winning Yapps. */
  hookCtr: string[];
  /** How many creators pitched in the first 24 hours. */
  pitched: number;
};

/** Fan order, left to right: the middle card (index 2) is the green one. */
export const SAMPLE_STORIES: SampleStory[] = [
  {
    id: "st-tablecrew",
    businessId: "b-tablecrew",
    title: "Tablecrew tripled demo bookings from one brief",
    results: [
      { value: "3×", label: "Demos" },
      { value: "−33%", label: "CAC" },
      { value: "2.9%", label: "CTR" },
    ],
    weeks: 7,
    yapps: 22,
    adSpend: "$16K",
    before: [40, 41, 39, 42, 40, 41],
    after: [48, 62, 80, 96, 110, 121],
    unit: "index",
    quote: "Problem → solution videos made our scheduling app obvious in ten seconds.",
    quoteBy: "VP marketing, Tablecrew",
    hookCtr: ["3.1%", "2.7%", "2.4%"],
    pitched: 8,
  },
  {
    id: "st-wrenlow",
    businessId: "b-wrenlow",
    title: "Wrenlow Audio doubled online sales with nine creators",
    results: [
      { value: "+120%", label: "Sales" },
      { value: "−41%", label: "CPC" },
      { value: "34%", label: "Hook rate" },
    ],
    weeks: 8,
    yapps: 31,
    adSpend: "$22K",
    before: [100, 98, 104, 101, 99, 103],
    after: [110, 135, 160, 182, 205, 220],
    unit: "index",
    quote: "Real desks, real commutes, real voices. People trusted it.",
    quoteBy: "Founder, Wrenlow Audio",
    hookCtr: ["2.8%", "2.5%", "2.2%"],
    pitched: 14,
  },
  {
    id: "st-notewren",
    businessId: "b-notewren",
    title: "Notewren cut acquisition cost by a third in six weeks",
    results: [
      { value: "−38%", label: "CAC" },
      { value: "+52%", label: "CTR" },
      { value: "3.6×", label: "ROAS" },
    ],
    weeks: 6,
    yapps: 24,
    adSpend: "$18K",
    before: [64, 62, 63, 61, 60, 62],
    after: [60, 52, 47, 43, 41, 40],
    unit: "money",
    quote: "We tested 24 hooks in the time an agency would ship two. The winners are still running.",
    quoteBy: "Head of growth, Notewren",
    hookCtr: ["3.4%", "3.0%", "2.6%"],
    pitched: 11,
  },
  {
    id: "st-roundleaf",
    businessId: "b-roundleaf",
    title: "Roundleaf dropped cost per install by 46%",
    results: [
      { value: "−46%", label: "CPI" },
      { value: "2.4%", label: "CTR" },
      { value: "1.8M", label: "Views" },
    ],
    weeks: 5,
    yapps: 18,
    adSpend: "$12K",
    before: [4.1, 4.0, 4.2, 4.1, 4.0, 4.1],
    after: [3.6, 3.0, 2.6, 2.4, 2.3, 2.2],
    unit: "money",
    quote: "App demos from creators beat our studio ads every single week.",
    quoteBy: "Marketing lead, Roundleaf",
    hookCtr: ["2.6%", "2.4%", "2.1%"],
    pitched: 9,
  },
  {
    id: "st-pixel",
    businessId: "b-pixel",
    title: "Pixel Arcade hit 1M installs in launch week",
    results: [
      { value: "1M", label: "Installs" },
      { value: "−29%", label: "CPI" },
      { value: "41%", label: "Hook rate" },
    ],
    weeks: 4,
    yapps: 16,
    adSpend: "$14K",
    before: [2.8, 2.9, 2.8, 2.9, 2.8, 2.9],
    after: [2.6, 2.4, 2.2, 2.1, 2.0, 2.0],
    unit: "money",
    quote: "Gamers trust gamers. Creator voiceovers outperformed our trailer three to one.",
    quoteBy: "Growth lead, Pixel Arcade",
    hookCtr: ["3.8%", "3.2%", "2.9%"],
    pitched: 12,
  },
];

/** The three result chips floating over the stories stage (desktop only). */
export const SAMPLE_FLOATING_RESULTS = [
  { label: "CAC", value: "−38%" },
  { label: "Sales", value: "+120%" },
  { label: "CPI", value: "−46%" },
] as const;

/* ------------------------------------------------------ honest comparison */

export type CompareCell = string | "yes" | "no" | "na";

/** Competitor ranges are market estimates: generic, no named competitors (Discover 4.9). */
export const SAMPLE_COMPARISON: { columns: string[]; rows: { label: string; cells: CompareCell[] }[] } = {
  columns: ["Yapp", "Agency", "DIY sourcing", "AI avatars"],
  rows: [
    { label: "Cost per video", cells: ["$60 – $300", "$500 – $2,000", "Varies", "$20 – $80"] },
    { label: "First video in", cells: ["2–3 days", "3–6 weeks", "1–3 weeks", "Same day"] },
    { label: "Real people & real homes", cells: ["yes", "yes", "yes", "no"] },
    { label: "Creator stats before you book", cells: ["yes", "no", "no", "na"] },
    { label: "Prices visible upfront", cells: ["yes", "no", "no", "yes"] },
    { label: "Payment held until you approve", cells: ["yes", "no", "no", "na"] },
    { label: "Ad usage rights included · you choose the term", cells: ["yes", "Extra", "Negotiated", "yes"] },
  ],
};

/* ------------------------------------------- a creator's audience and views */

export type SampleCreatorFigures = {
  /** Views per day, last 30 days. */
  views30: number[];
  /** Change against the previous 30 days, in %. */
  viewsChangePct: number;
  country: { label: string; pct: number }[];
  age: { label: string; pct: number }[];
  gender: { label: string; pct: number }[];
};

/** A creator's views trend and audience: sample, the same on every render for the same creator. */
export function sampleCreatorFigures(creatorId: string, avgViews: number | null): SampleCreatorFigures {
  const rand = seeded(`discover:creator:${creatorId}`);
  const base = Math.max(2000, (avgViews ?? 40000) / 18);
  const views30 = series(rand, 30, base, base * (0.004 + rand() * 0.02), base * 0.07).map(Math.round);
  const first = views30.slice(0, 10).reduce((a, b) => a + b, 0);
  const last = views30.slice(-10).reduce((a, b) => a + b, 0);
  const us = Math.round(55 + rand() * 25);
  const ca = Math.round((100 - us) * 0.6);
  const uk = Math.round((100 - us - ca) * 0.5);
  const a1 = Math.round(28 + rand() * 15);
  const a2 = Math.round(25 + rand() * 12);
  const a3 = Math.round(10 + rand() * 10);
  const women = Math.round(40 + rand() * 35);
  return {
    views30,
    viewsChangePct: Math.round((last / Math.max(1, first) - 1) * 100),
    country: [
      { label: "United States", pct: us },
      { label: "Canada", pct: ca },
      { label: "United Kingdom", pct: uk },
      { label: "Other", pct: 100 - us - ca - uk },
    ],
    age: [
      { label: "18–24", pct: a1 },
      { label: "25–34", pct: a2 },
      { label: "35–44", pct: a3 },
      { label: "45+", pct: 100 - a1 - a2 - a3 },
    ],
    gender: [
      { label: "Women", pct: women },
      { label: "Men", pct: 100 - women },
    ],
  };
}
