/**
 * Find work's filters, as they live in the URL (Work spec 6.5.8: every filter is in the query
 * string so a link can be shared and Back works). Parse, serialize and turn into a `findWork()`
 * query. Pure: no React, no store.
 *
 * Keys (on `/work?tab=find`): `type` campaign | custom · `q` search · `cat` categories (comma
 * list) · `job` job types (comma list) · `fmt` one format · `plat` one platform · `pay` 150 | 300 |
 * 500 · `within` 3 | 7 · `sort` closing | newest | pay-high | pay-low · `view` list · `page` n.
 * Defaults are left out, so a plain `/work?tab=find` is "everything, recommended first".
 */

import { paths } from "@/lib/paths";
import type { WorkKind, WorkQuery, WorkSort } from "@/lib/selectors";
import {
  WORK_CLOSING_STEPS,
  WORK_PAY_STEPS,
  formats,
  jobTypes,
  niches,
  platforms,
} from "@/lib/taxonomy";
import type { FormatId, JobType, NicheId, PlatformId } from "@/lib/types";

export type FindView = "cards" | "list";

export type FindState = {
  kind: "all" | WorkKind;
  q: string;
  categories: NicheId[];
  jobTypes: JobType[];
  format: FormatId | "all";
  platform: PlatformId | "any";
  /** 0 = any. */
  minPay: number;
  /** 0 = any time. */
  within: number;
  sort: WorkSort;
  view: FindView;
  page: number;
};

export const DEFAULT_FIND: FindState = {
  kind: "all",
  q: "",
  categories: [],
  jobTypes: [],
  format: "all",
  platform: "any",
  minPay: 0,
  within: 0,
  sort: "recommended",
  view: "cards",
  page: 1,
};

export const sortOptions: { value: WorkSort; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "closing", label: "Closing soonest" },
  { value: "newest", label: "Newest" },
  { value: "pay-high", label: "Pay: high to low" },
  { value: "pay-low", label: "Pay: low to high" },
];

const nicheIds = new Set<string>(niches.map((n) => n.id));
const jobIds = new Set<string>(jobTypes.map((j) => j.id));
const formatIds = new Set<string>(formats.map((f) => f.id));
const platformIds = new Set<string>(platforms.map((p) => p.id));
const sortIds = new Set<string>(sortOptions.map((o) => o.value));

const list = (value: string | null) =>
  (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

/** Read the filters from a query string (unknown values fall back to the default). */
export function parseFind(params: Pick<URLSearchParams, "get">): FindState {
  const type = params.get("type");
  const pay = Number(params.get("pay"));
  const within = Number(params.get("within"));
  const page = Math.floor(Number(params.get("page")));
  const fmt = params.get("fmt") ?? "";
  const plat = params.get("plat") ?? "";
  const sort = params.get("sort") ?? "";
  return {
    kind: type === "campaign" || type === "custom" ? type : "all",
    q: (params.get("q") ?? "").slice(0, 80),
    // Keep the taxonomy's order, so the same filters always make the same URL.
    categories: niches.map((n) => n.id).filter((id) => list(params.get("cat")).includes(id) && nicheIds.has(id)),
    jobTypes: jobTypes.map((j) => j.id).filter((id) => list(params.get("job")).includes(id) && jobIds.has(id)),
    format: formatIds.has(fmt) ? (fmt as FormatId) : "all",
    platform: platformIds.has(plat) ? (plat as PlatformId) : "any",
    minPay: (WORK_PAY_STEPS as readonly number[]).includes(pay) ? pay : 0,
    within: (WORK_CLOSING_STEPS as readonly number[]).includes(within) ? within : 0,
    sort: sortIds.has(sort) ? (sort as WorkSort) : "recommended",
    view: params.get("view") === "list" ? "list" : "cards",
    page: page > 1 ? page : 1,
  };
}

/** `/work?tab=find&…` for these filters, defaults left out. */
export function findHref(state: FindState): string {
  return paths.findWork({
    type: state.kind === "all" ? undefined : state.kind,
    q: state.q.trim() || undefined,
    cat: state.categories.length ? state.categories.join(",") : undefined,
    job: state.jobTypes.length ? state.jobTypes.join(",") : undefined,
    fmt: state.format === "all" ? undefined : state.format,
    plat: state.platform === "any" ? undefined : state.platform,
    pay: state.minPay || undefined,
    within: state.within || undefined,
    sort: state.sort === "recommended" ? undefined : state.sort,
    view: state.view === "list" ? "list" : undefined,
    page: state.page > 1 ? state.page : undefined,
  });
}

/** The selector's query for these filters (paging and kind can be overridden per panel). */
export function toWorkQuery(state: FindState, overrides: Partial<WorkQuery> = {}): WorkQuery {
  return {
    kind: state.kind,
    q: state.q,
    categories: state.categories,
    jobTypes: state.jobTypes,
    format: state.format,
    platform: state.platform,
    minPay: state.minPay,
    closingWithinDays: state.within,
    sort: state.sort,
    page: state.page,
    ...overrides,
  };
}

/** True when anything narrows the results (the type bar and sort don't count). */
export const hasFilters = (state: FindState) =>
  Boolean(
    state.q.trim() ||
      state.categories.length ||
      state.jobTypes.length ||
      state.format !== "all" ||
      state.platform !== "any" ||
      state.minPay ||
      state.within,
  );

/** Clear all (Work spec 6.5.8): every filter, the type and the search; sort and view stay. */
export const clearedFind = (state: FindState): FindState => ({
  ...DEFAULT_FIND,
  sort: state.sort,
  view: state.view,
});

/* -------------------------------------------------------------------------- */
/* Remembering where Find work was, for the job page's back pill               */
/* -------------------------------------------------------------------------- */

const KEY = "yapp-find-work-href";

/** Called when a job is opened from Find work: the job page's "← Find work" comes back here. */
export function rememberFindWork(href: string) {
  try {
    window.sessionStorage.setItem(KEY, href);
  } catch {
    /* private mode or blocked storage: the back pill falls back to plain Find work */
  }
}

/** The Find work address to go back to (only ever a Work address). */
export function lastFindWork(): string {
  try {
    const href = window.sessionStorage.getItem(KEY);
    if (href && href.startsWith("/work?") && href.includes("tab=find")) return href;
  } catch {
    /* fall through */
  }
  return paths.findWork();
}
