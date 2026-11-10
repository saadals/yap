"use client";

import { Lightbulb, Megaphone, MessagesSquare, Plus, UserRoundSearch } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { Block } from "@/components/ui/block";
import { money, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { me } from "@/lib/selectors";
import { type DemoState, useDemo } from "@/lib/store";
import { CAMPAIGN_MIN_VIDEOS, followerTiers } from "@/lib/taxonomy";
import type { Product } from "@/lib/types";

import { IconTile } from "./order-row";
import { RowLink } from "./row-link";

/** The signed-in buyer profile's saved products, the one with the most orders first. */
export function myProducts(s: DemoState): Product[] {
  const businessId = me.ids(s).businessId;
  const uses = (id: string) =>
    s.commissions.filter((c) => c.businessId === businessId && c.brief.productId === id).length +
    s.requests.filter((r) => r.businessId === businessId && r.brief.productId === id).length;
  return s.products
    .filter((p) => p.businessId === businessId)
    .sort((a, b) => uses(b.id) - uses(a.id) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

const lowestPrice = Math.min(...followerTiers.filter((t) => !t.placeholder).map((t) => t.pricePerVideo));

/**
 * Start an order: three ways to work, in plain words, with the product the brief starts from.
 * When nothing needs you, "Get pitches" carries the screen's one green action.
 */
export function StartOrder({ highlight }: { highlight: boolean }) {
  const s = useDemo();
  const products = myProducts(s);
  const selectId = useId();
  const [picked, setPicked] = useState<string | null>(null);
  const product = products.find((p) => p.id === picked) ?? products[0];
  const productId = product?.id;
  const learnings = product?.learnings.length ?? 0;

  const choices = [
    {
      key: "creator",
      icon: <UserRoundSearch size={18} />,
      title: "Pick a creator",
      line: "Watch portfolios and order from one creator at their price.",
      href: paths.discover(),
    },
    {
      key: "pitches",
      icon: <MessagesSquare size={18} />,
      title: "Get pitches",
      line: "Describe the video. Creators send ideas and quotes, you choose.",
      href: paths.newOrder({ type: "custom", product: productId }),
    },
    {
      key: "campaign",
      icon: <Megaphone size={18} />,
      title: "Run a UGC campaign",
      line: `${CAMPAIGN_MIN_VIDEOS} or more creators post on their own accounts, from ${money(lowestPrice)} a video.`,
      href: paths.newOrder({ type: "campaign", product: productId }),
    },
  ];

  return (
    <Block as="section" aria-labelledby="start-title" tone="paper" pad="none" className="overflow-hidden">
      <div className="flex flex-col gap-3 px-5 pt-5 pb-4">
        <h2 id="start-title" className="y-head">
          Start an order
        </h2>
        {products.length ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={selectId} className="y-small y-fg-2">
              For
            </label>
            <select
              id={selectId}
              className="y-input"
              value={productId}
              onChange={(event) => setPicked(event.target.value)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="y-micro y-fg-2 flex items-center gap-1.5 pt-0.5">
              <Lightbulb size={14} aria-hidden className="flex-none" />
              {learnings
                ? `${plural(learnings, "learning")} carried forward into the brief`
                : "Its audience, tone and dos and don'ts go into the brief"}
            </p>
          </div>
        ) : (
          <p className="y-small y-fg-2">
            Save your product once and every brief starts from it.{" "}
            <Link href={paths.newProduct} className="y-link font-medium text-(--y-ink)">
              Add a product
            </Link>
          </p>
        )}
      </div>
      <div role="list" aria-label="Ways to order" className="y-list border-t border-(--b-line)">
        {choices.map((choice) => {
          const green = highlight && choice.key === "pitches";
          return (
            <RowLink
              key={choice.key}
              href={choice.href}
              lead={<IconTile>{choice.icon}</IconTile>}
              title={choice.title}
              meta={choice.line}
              wrap
              chevron={!green}
              below={
                green ? (
                  <span aria-hidden className="y-pill pointer-events-none" data-variant="neon" data-size="sm">
                    <Plus size={15} aria-hidden />
                    Start
                  </span>
                ) : undefined
              }
            />
          );
        })}
      </div>
    </Block>
  );
}
