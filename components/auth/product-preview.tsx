"use client";

import { Ban, Check, Megaphone } from "lucide-react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { Block } from "@/components/ui/block";
import { Chip } from "@/components/ui/chip";
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
  return <span className="y-fg-3">{children}</span>;
}

/** Live preview of the product profile that carries into every brief. */
export function ProductPreview({ draft, skipped }: { draft: ProductDraft; skipped?: boolean }) {
  const name = draft.productName.trim();
  return (
    <Block
      as="section"
      tone="lavender"
      pad="md"
      className="flex flex-col gap-5"
      aria-label="Product profile preview"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="y-micro y-fg-2">Product profile preview</p>
        <span className="y-chip">{skipped ? "Skipped for now" : "Goes into every brief"}</span>
      </div>

      <div className="flex items-start gap-3">
        <BusinessLogo
          business={{ name: name || "Product", monogram: initials(name) || "?", brandColor: PRODUCT_COLOUR }}
          size={52}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="y-display y-title break-words">{name || <Placeholder>Your product</Placeholder>}</p>
          <p className="y-small y-fg-2 break-words">
            {draft.oneLiner.trim() || "One line on what it does."}
          </p>
        </div>
      </div>

      {draft.surfaces.length > 0 || draft.tone.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {draft.surfaces.map((surface) => (
            <Chip key={surface}>{surfaceLabels[surface]}</Chip>
          ))}
          {draft.tone.map((word) => (
            <Chip key={word}>{word}</Chip>
          ))}
        </div>
      ) : null}

      <dl className="flex flex-col gap-3">
        <div className="y-tile flex flex-col gap-1 p-3">
          <dt className="y-micro y-fg-2">Who it&apos;s for</dt>
          <dd className="y-small y-clamp-2 break-words">
            {draft.audience.trim() || <Placeholder>The people who should see these videos.</Placeholder>}
          </dd>
        </div>
        <div className="y-tile flex flex-col gap-1 p-3">
          <dt className="y-micro y-fg-2">The problem it solves</dt>
          <dd className="y-small y-clamp-2 break-words">
            {draft.problem.trim() || <Placeholder>The everyday pain your app removes.</Placeholder>}
          </dd>
        </div>
      </dl>

      {draft.dos.length > 0 || draft.donts.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {draft.dos.map((item) => (
            <li key={`do-${item}`} className="y-small flex items-start gap-2">
              <Check size={16} strokeWidth={2.5} aria-hidden className="mt-0.5 flex-none" />
              <span>
                <span className="sr-only">Do: </span>
                {item}
              </span>
            </li>
          ))}
          {draft.donts.map((item) => (
            <li key={`dont-${item}`} className="y-small flex items-start gap-2">
              <Ban size={16} aria-hidden className="mt-0.5 flex-none" />
              <span>
                <span className="sr-only">Don&apos;t: </span>
                {item}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="y-small flex items-start gap-2 font-medium">
        <Megaphone size={16} aria-hidden className="mt-0.5 flex-none" />
        <span className="break-words">
          {draft.cta.trim() ? `“${draft.cta.trim()}”` : <Placeholder>Your call to action</Placeholder>}
        </span>
      </p>
    </Block>
  );
}
