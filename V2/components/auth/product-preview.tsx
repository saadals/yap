"use client";

import { BusinessLogo } from "@/components/domain/business-logo";
import { Block } from "@/components/ui/block";
import { initials } from "@/lib/format";

export const PRODUCT_COLOUR = "#1F4FD1";

export const surfaceLabels: Record<"ios" | "android" | "web", string> = {
  ios: "iOS app",
  android: "Android app",
  web: "Web app",
};

export type ProductDraft = {
  productName: string;
  oneLiner: string;
  problem: string;
  audience: string;
  surfaces: ("ios" | "android" | "web")[];
  features: string[];
  tone: string[];
  dos: string[];
  donts: string[];
  cta: string;
};

function Placeholder({ children }: { children: React.ReactNode }) {
  return <span className="y-fg-2">{children}</span>;
}

/** Compact live preview of the product profile that carries into every brief. */
export function ProductPreview({ draft, skipped }: { draft: ProductDraft; skipped?: boolean }) {
  const name = draft.productName.trim();
  const meta = [...draft.surfaces.map((surface) => surfaceLabels[surface]), ...draft.tone].join(" · ");
  return (
    <Block
      as="section"
      tone="paper"
      pad="md"
      className="flex flex-col gap-4"
      aria-label="Product profile preview"
    >
      <p className="y-micro y-fg-2">
        {skipped ? "Preview · skipped for now" : "Preview · goes into every brief"}
      </p>

      <div className="flex items-start gap-3">
        <BusinessLogo
          business={{ name: name || "Product", monogram: initials(name) || "?", brandColor: PRODUCT_COLOUR }}
          size={48}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="y-head break-words">{name || <Placeholder>Your product</Placeholder>}</p>
          <p className="y-small y-fg-2 break-words">
            {draft.oneLiner.trim() || "One line on what it does."}
          </p>
          {meta ? <p className="y-micro y-fg-2 break-words">{meta}</p> : null}
        </div>
      </div>

      <p className="y-small y-clamp-2 break-words">
        <span className="y-fg-2">For </span>
        {draft.audience.trim() || <Placeholder>the people who should see these videos.</Placeholder>}
      </p>
    </Block>
  );
}
