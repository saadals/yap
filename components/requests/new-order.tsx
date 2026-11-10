"use client";

import { Megaphone, MessagesSquare, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { CampaignWizard } from "@/components/campaigns";
import { AppShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { money } from "@/lib/format";
import { paths, type OrderType } from "@/lib/paths";
import { isCampaign, requestById } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";
import { CAMPAIGN_FEE_RATE, SERVICE_FEE_RATE, followerTiers } from "@/lib/taxonomy";

import { RequestWizardPage } from "./wizard";
import { ChoiceTile } from "./wizard-parts";

/**
 * /orders/new. Without `?type` it asks which kind of order first; `?type=campaign` is the UGC
 * campaign wizard, `?type=custom` (or `?draft=`) the custom request wizard. `?product=` and
 * `?creator=` carry through.
 */
export function NewOrderPage() {
  return (
    <Suspense fallback={<PickerShell />}>
      <NewOrderRouter />
    </Suspense>
  );
}

function NewOrderRouter() {
  const params = useSearchParams();
  const s = useDemo();
  const hydrated = useHydrated();
  const type = params.get("type");
  if (params.get("draft") || type === "custom") return <RequestWizardPage />;
  if (type === "campaign") return <CampaignWizard />;
  // "Run again" without a type: follow the kind of the order being repeated.
  const again = params.get("again");
  if (again) {
    if (!hydrated) return <PickerShell />;
    const previous = requestById(s, again);
    if (previous) return isCampaign(previous) ? <CampaignWizard /> : <RequestWizardPage />;
  }
  return <TypePicker key={params.toString()} params={new URLSearchParams(params.toString())} />;
}

function PickerShell() {
  return (
    <AppShell focus>
      <Page width="narrow">
        <div className="y-block y-pad-lg flex flex-col gap-6" data-tone="paper" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-11 w-11" />
          <Skeleton className="h-12 w-3/5" />
          <div className="grid gap-2 md:grid-cols-2">
            <Skeleton className="h-40 !rounded-(--y-r-tile)" />
            <Skeleton className="h-40 !rounded-(--y-r-tile)" />
          </div>
        </div>
      </Page>
    </AppShell>
  );
}

const CHOICES: {
  type: OrderType;
  title: string;
  body: string;
  meta: string;
  icon: React.ReactNode;
}[] = [
  {
    type: "campaign",
    title: "UGC campaign",
    body: "10+ videos, each from a different creator. Fixed price per video by follower tier. Creators take slots first come, first served.",
    meta: `From ${money(Math.min(...followerTiers.map((t) => t.pricePerVideo)))} a video · ${Math.round(CAMPAIGN_FEE_RATE * 100)}% fee, held with the budget`,
    icon: <Megaphone size={22} aria-hidden />,
  },
  {
    type: "custom",
    title: "Custom request",
    body: "Creators pitch with ideas and samples. You pick who to hire.",
    meta: `You set the budget · ${Math.round(SERVICE_FEE_RATE * 100)}% fee, held with the payment`,
    icon: <MessagesSquare size={22} aria-hidden />,
  },
];

function TypePicker({ params }: { params: URLSearchParams }) {
  const product = params.get("product") ?? undefined;
  const creator = params.get("creator") ?? undefined;
  // Coming from a creator's profile means picking that creator: only a custom request does that.
  const [choice, setChoice] = useState<OrderType | null>(creator ? "custom" : null);
  const [tried, setTried] = useState(false);

  const href = choice
    ? paths.newOrder(choice === "campaign" ? { type: choice, product } : { type: choice, product, creator })
    : undefined;

  return (
    <AppShell focus>
      <Page width="narrow">
        <Block tone="paper" pad="lg" className="flex flex-col gap-6">
          <Link
            href={paths.orders()}
            className="y-round"
            data-tone-btn="soft"
            data-size="sm"
            aria-label="Close"
            title="Close"
          >
            <X size={18} aria-hidden />
          </Link>
          <h1 className="y-display y-t-display">What would you like to order?</h1>

          <div role="radiogroup" aria-label="Order type" className="grid gap-2 md:grid-cols-2">
            {CHOICES.map((item) => (
              <ChoiceTile
                key={item.type}
                name="order-type"
                checked={choice === item.type}
                onChange={() => {
                  setChoice(item.type);
                  setTried(false);
                }}
                className="!p-5 md:!p-6"
              >
                <span className="y-round mb-2" data-tone-btn="soft" aria-hidden>
                  {item.icon}
                </span>
                <span className="y-head">{item.title}</span>
                <span className="y-body y-fg-2">{item.body}</span>
                <span className="y-micro y-fg-2 mt-3 border-t border-(--b-line) pt-3">{item.meta}</span>
              </ChoiceTile>
            ))}
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
            {tried && !choice ? (
              <p className="y-small y-fg-2 sm:me-auto" role="status">
                Pick one to continue.
              </p>
            ) : null}
            {href ? (
              <PillButton href={href} variant="neon" size="lg" arrow className="justify-between ps-6 sm:min-w-56">
                Continue
              </PillButton>
            ) : (
              <PillButton
                variant="neon"
                size="lg"
                arrow
                aria-disabled="true"
                className="justify-between ps-6 sm:min-w-56"
                onClick={() => setTried(true)}
              >
                Continue
              </PillButton>
            )}
          </div>
        </Block>
      </Page>
    </AppShell>
  );
}
