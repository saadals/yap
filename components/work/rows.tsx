import { ArrowRight } from "lucide-react";

import { PillButton } from "@/components/ui/pill-button";

/** Shared look for a compact row inside a Work block: the whole row links, hover tints it. */
export const rowClass =
  "relative -mx-3 flex items-center gap-3 rounded-(--y-r-tile) px-3 py-3 transition-colors duration-(--y-dur-1) hover:bg-(--b-chip)";
export const stretched = "after:absolute after:inset-0 after:rounded-(--y-r-tile) after:content-['']";

/** Block heading with an optional count and a quiet "View all" link. */
export function BlockHeader({
  id,
  title,
  count,
  href,
  linkLabel = "View all",
}: {
  id: string;
  title: string;
  count?: number;
  href: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 id={id} className="y-display y-title">
        {title} {count ? <span className="y-fg-3 y-num">{count}</span> : null}
      </h2>
      <PillButton
        href={href}
        variant="ghost"
        size="sm"
        className="-me-3"
        icon={<ArrowRight size={16} aria-hidden className="y-flip order-last" />}
      >
        {linkLabel}
      </PillButton>
    </div>
  );
}
