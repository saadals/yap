"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { plural } from "@/lib/format";
import { useDemo } from "@/lib/store";
import type { Product } from "@/lib/types";

import { ProductMark } from "./product-mark";

/** A saved product as a quiet card: name, one-liner, one meta line. The whole card opens it. */
export function ProductCard({ product }: { product: Product }) {
  const s = useDemo();
  const commissions = s.commissions.filter(
    (c) =>
      c.brief.productId === product.id && c.status !== "declined" && c.status !== "cancelled",
  ).length;
  const learnings = product.learnings.length;
  const meta = [
    learnings ? plural(learnings, "learning") : "No learnings yet",
    commissions ? plural(commissions, "commission") : "Not used yet",
  ].join(" · ");

  return (
    <article data-tone="paper" className="y-block y-hoverable relative flex w-full items-center gap-4 p-5 md:p-6">
      <ProductMark product={product} size={48} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="y-head">
          <Link
            href={`/business/products/${product.id}`}
            className="after:absolute after:inset-0 after:rounded-(--y-r-block) after:content-['']"
          >
            {product.name}
          </Link>
        </h2>
        <p className="y-small y-fg-2 y-clamp-2">{product.oneLiner}</p>
        <p className="y-micro y-fg-2 mt-1">{meta}</p>
      </div>
      <ChevronRight size={20} aria-hidden className="y-flip y-fg-3 flex-none" />
    </article>
  );
}
