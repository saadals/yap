"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { MarketingMain, useStartLinks } from "@/components/marketing/blocks";
import { PublicShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { List, Row } from "@/components/ui/list";
import { PillButton } from "@/components/ui/pill-button";
import { paths } from "@/lib/paths";
import { orderKinds } from "@/lib/taxonomy";

import { services, type ServiceEntry } from "./catalogue";
import { ServiceIcon } from "./service-page";

const runsOnLabel = (entry: ServiceEntry) =>
  entry.runsOn === "both" ? "Both kinds of order" : orderKinds[entry.runsOn].name;

/**
 * /services: a calm index of what Yapp offers brands (round 3 answers, item 37). One row per
 * service, each saying which kind of order it runs on; the hidden services never appear. The one
 * green action starts an order (signed out, through sign-in as someone ordering).
 */
export function ServicesIndex() {
  const start = useStartLinks();
  return (
    <PublicShell>
      <MarketingMain>
        {/* Phones read title, then the list, then the button; desktop puts the list beside them. */}
        <section
          aria-labelledby="services-title"
          className="grid gap-x-12 gap-y-8 pt-10 pb-6 md:pt-16 lg:grid-cols-12 lg:grid-rows-[auto_1fr]"
        >
          <div className="flex flex-col gap-6 lg:col-span-5 lg:row-start-1 lg:pt-2">
            <p className="y-eyebrow">Services</p>
            <h1 id="services-title" className="y-display y-t-section -mt-2 max-w-[14ch] text-balance">
              What you can get made on Yapp
            </h1>
            <p className="y-lead y-fg-2 max-w-[44ch]">
              Every service runs on one of two kinds of order: a {orderKinds.custom.name.toLowerCase()}, where
              creators pitch and you hire one, or a {orderKinds.campaign.name}, where ten or more creators post on
              their own accounts.
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-3 lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
            <List label="Services">
              {services.map((entry) => (
                <Row
                  key={entry.slug}
                  href={entry.href}
                  lead={<ServiceIcon slug={entry.slug} />}
                  title={entry.title}
                  meta={<span className="block whitespace-normal">{entry.description}</span>}
                  end={<span className="y-micro y-fg-2 max-sm:hidden">{runsOnLabel(entry)}</span>}
                  className="!min-h-[76px]"
                />
              ))}
            </List>
            <Block tone="paper" pad="md" className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="y-head">Not sure which fits?</p>
                <p className="y-small y-fg-2">Compare the ways to order, with prices and how payment is protected.</p>
              </div>
              <Link
                href={paths.howItWorks}
                className="y-small inline-flex flex-none items-center gap-1.5 font-medium hover:underline"
              >
                How it works
                <ArrowRight size={15} aria-hidden className="y-flip" />
              </Link>
            </Block>
          </div>
          <div className="flex flex-col gap-4 lg:col-span-5 lg:row-start-2">
            <div className="flex flex-wrap gap-2">
              <PillButton href={start.order(paths.newOrder())} variant="neon" size="lg" arrow>
                Start an order
              </PillButton>
            </div>
            <p className="y-small y-fg-2 flex items-start gap-2">
              <ShieldCheck size={16} aria-hidden className="mt-0.5 flex-none" />
              The price you agree is the price you pay, held until you approve.
            </p>
          </div>
        </section>
      </MarketingMain>
    </PublicShell>
  );
}
