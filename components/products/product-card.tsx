"use client";

import { FilePlus2, Lightbulb, Pencil } from "lucide-react";
import Link from "next/link";

import { PillButton } from "@/components/ui/pill-button";
import { plural, timeAgo } from "@/lib/format";
import { historyForProduct, isActive } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { nicheById } from "@/lib/taxonomy";
import type { Product } from "@/lib/types";

import { surfaceLabel } from "./product-form";
import { ProductMark } from "./product-mark";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="y-tile flex flex-col-reverse gap-1 p-3">
      <dt className="y-micro y-fg-2">{label}</dt>
      <dd className="y-display y-num text-[28px] leading-none font-semibold tracking-[-0.03em]">{value}</dd>
    </div>
  );
}

/** A saved product: what it is, how much context it carries, and the two next actions. */
export function ProductCard({ product }: { product: Product }) {
  const s = useDemo();
  const made = historyForProduct(s, product.id).length;
  const inProgress = s.commissions.filter(
    (c) => c.brief.productId === product.id && isActive(c),
  ).length;
  const latest = product.learnings[0];
  const href = `/business/products/${product.id}`;

  return (
    <article data-tone="paper" className="y-block y-hoverable relative flex w-full flex-col gap-5 p-5 md:p-6">
      <div className="flex items-start gap-4">
        <ProductMark product={product} size={56} />
        <div className="min-w-0 flex-1">
          <h2 className="y-display y-title">
            <Link
              href={href}
              className="after:absolute after:inset-0 after:rounded-(--y-r-block) after:content-['']"
            >
              {product.name}
            </Link>
          </h2>
          <p className="y-small y-fg-2 y-clamp-2 mt-1">{product.oneLiner}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="y-chip">{nicheById[product.niche].name}</span>
        {product.surfaces.map((surface) => (
          <span key={surface} className="y-chip">
            {surfaceLabel[surface]}
          </span>
        ))}
        {product.tone.slice(0, 3).map((tone) => (
          <span key={tone} className="y-chip">
            {tone}
          </span>
        ))}
        {product.tone.length > 3 ? <span className="y-chip">+{product.tone.length - 3}</span> : null}
      </div>

      <dl className="grid grid-cols-3 gap-2">
        <Stat value={product.learnings.length} label={product.learnings.length === 1 ? "learning" : "learnings"} />
        <Stat value={product.assets.length} label={product.assets.length === 1 ? "file" : "files"} />
        <Stat value={made} label={made === 1 ? "video made" : "videos made"} />
      </dl>

      {latest ? (
        <div className="flex items-start gap-3 border-t border-(--b-line) pt-4">
          <Lightbulb size={18} aria-hidden className="mt-0.5 flex-none" />
          <p className="y-small y-clamp-2">
            <span className="y-fg-2">Latest learning: </span>
            {latest.text}
          </p>
        </div>
      ) : (
        <p className="y-small y-fg-2 flex items-start gap-3 border-t border-(--b-line) pt-4">
          <Lightbulb size={18} aria-hidden className="mt-0.5 flex-none" />
          No learnings yet. They&apos;re added when you approve a video for this product.
        </p>
      )}

      <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="y-micro y-fg-2">
          Updated {timeAgo(product.updatedAt) === "Yesterday" ? "yesterday" : timeAgo(product.updatedAt)}
          {inProgress ? ` · ${plural(inProgress, "commission")} in progress` : ""}
        </p>
        <div className="relative z-[3] flex flex-wrap gap-2">
          <PillButton href={href} variant="outline" size="sm" icon={<Pencil size={16} aria-hidden />}>
            Edit
          </PillButton>
          <PillButton
            href={`/business/requests/new?product=${product.id}`}
            variant="contrast"
            size="sm"
            icon={<FilePlus2 size={16} aria-hidden />}
          >
            New request for this product
          </PillButton>
        </div>
      </div>
    </article>
  );
}
