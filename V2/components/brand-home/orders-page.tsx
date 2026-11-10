"use client";

import { Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { List } from "@/components/ui/list";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { useDemo, useHydrated } from "@/lib/store";

import { type OrderStage, matchesQuery, orderItems, sortItems } from "./order-items";
import { OrderRow } from "./order-row";

const TABS: { id: OrderStage; label: string; view?: string }[] = [
  { id: "progress", label: "In progress" },
  { id: "open", label: "Open", view: "open" },
  { id: "done", label: "Done", view: "done" },
];

const tabHref = (id: OrderStage) => paths.orders({ view: TABS.find((t) => t.id === id)?.view });

/**
 * /orders: everything the signed-in account ordered, in three tabs (`?view=`): In progress (jobs
 * and running campaigns, what needs you first), Open (custom requests taking pitches, drafts) and
 * Done. Search covers title, creator, product and format. Uses `useSearchParams`: render inside
 * <Suspense>.
 */
export function OrdersPage() {
  const s = useDemo();
  const hydrated = useHydrated();
  const params = useSearchParams();
  const [query, setQuery] = useState("");

  const view = params.get("view");
  const tab: OrderStage = view === "open" || view === "done" ? view : "progress";

  const header = (
    <PageHeader
      title="Orders"
      description="Everything you ordered, from the first pitch to the approved video."
      actions={
        // Desktop has "New order" in the header; phones get it here, with a label.
        <PillButton href={paths.newOrder()} variant="contrast" icon={<Plus size={18} aria-hidden />} className="lg:hidden">
          New order
        </PillButton>
      }
    />
  );

  if (!hydrated) return <OrdersSkeleton header={header} />;

  const all = orderItems(s);
  const trimmed = query.trim();
  const inTab = (stage: OrderStage) => all.filter((item) => item.stage === stage);
  const shown = sortItems(inTab(tab).filter((item) => matchesQuery(s, item, trimmed)));
  const elsewhere = trimmed
    ? TABS.filter((t) => t.id !== tab)
        .map((t) => ({ ...t, count: inTab(t.id).filter((item) => matchesQuery(s, item, trimmed)).length }))
        .filter((t) => t.count > 0)
    : [];
  const needs = shown.filter((item) => item.needsYou).length;

  return (
    <Page>
      {header}

      <div className="flex flex-col gap-3 pb-4 md:flex-row md:items-end md:justify-between">
        <Tabs
          label="Orders by stage"
          value={tab}
          items={TABS.map((t) => ({ id: t.id, label: t.label, count: inTab(t.id).length, href: tabHref(t.id) }))}
          className="md:flex-1"
        />
        <label className="relative block w-full md:mb-1 md:w-72">
          <span className="sr-only">Search orders</span>
          <Search size={17} aria-hidden className="y-fg-2 pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search orders"
            className="y-input !ps-10 !pe-10"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="y-round absolute end-1 top-1/2 -translate-y-1/2"
              data-tone-btn="ghost"
              data-size="sm"
              aria-label="Clear search"
            >
              <X size={16} aria-hidden />
            </button>
          ) : null}
        </label>
      </div>

      <p className="sr-only" aria-live="polite">
        {plural(shown.length, "order")} shown{needs ? `, ${needs} need you` : ""}
      </p>

      {shown.length ? (
        <List label={TABS.find((t) => t.id === tab)!.label} className="y-enter">
          {shown.map((item) => (
            <OrderRow key={item.key} item={item} />
          ))}
        </List>
      ) : trimmed ? (
        <Block tone="paper" pad="md">
          <EmptyState
            headingLevel={2}
            shape="bean"
            tint="sun"
            title={`Nothing here matches “${trimmed}”`}
            body={
              elsewhere.length
                ? `Found in ${elsewhere.map((t) => `${t.label} (${t.count})`).join(" and ")}.`
                : "Try a creator's first name, a product or a format like “app demo”."
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {elsewhere.map((t) => (
                  <PillButton key={t.id} href={tabHref(t.id)} variant="contrast">
                    See {t.label.toLowerCase()}
                  </PillButton>
                ))}
                <PillButton variant={elsewhere.length ? "ghost" : "contrast"} onClick={() => setQuery("")}>
                  Clear search
                </PillButton>
              </div>
            }
          />
        </Block>
      ) : (
        <Block tone="paper" pad="md">
          <TabEmpty tab={tab} />
        </Block>
      )}
    </Page>
  );
}

function TabEmpty({ tab }: { tab: OrderStage }) {
  if (tab === "progress")
    return (
      <EmptyState
        shape="pill"
        tint="mint"
        face="smile"
        title="Nothing in progress"
        body="When a creator accepts your order or your campaign starts, it's tracked here until the video is approved."
        action={
          <PillButton href={paths.newOrder()} variant="contrast" arrow>
            Start an order
          </PillButton>
        }
      />
    );
  if (tab === "open")
    return (
      <EmptyState
        shape="dome"
        tint="violet"
        face="calm"
        title="Nothing open for pitches"
        body="Describe the video you need and creators send ideas and quotes. Drafts you save wait here too."
        action={
          <PillButton href={paths.newOrder({ type: "custom" })} variant="contrast" arrow>
            Get pitches
          </PillButton>
        }
      />
    );
  return (
    <EmptyState
      shape="tower"
      tint="sun"
      face="focus"
      title="Nothing finished yet"
      body="Approved jobs, closed campaigns and cancelled orders collect here. The approved videos themselves live in your Library."
      action={
        <Link href={paths.library()} className="y-small y-link font-medium">
          Open the Library
        </Link>
      }
    />
  );
}

function OrdersSkeleton({ header }: { header: React.ReactNode }) {
  return (
    <Page>
      {header}
      <div aria-busy="true" aria-label="Loading orders" className="flex flex-col gap-4">
        <div className="flex gap-6" aria-hidden>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div data-tone="paper" className="y-block flex flex-col" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 border-b border-(--b-line) px-5 py-4 last:border-0">
              <Skeleton className="size-10 !rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-6 w-28 !rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}
