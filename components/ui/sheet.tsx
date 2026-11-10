"use client";

import { X } from "lucide-react";
import { useId, useRef } from "react";
import { createPortal } from "react-dom";

import type { BlockTone } from "./block";
import { useModal, usePortalHost } from "./dialog";

/**
 * Modal sheet. Phones: a bottom sheet with a grabber. From 768px: `side="end"` is the side sheet
 * (16px from the edges, radius 30) for multi-step actions, `side="center"` a centred dialog.
 * Head: 22px title, one line of description, a 44px close circle (glass with a hairline on side
 * sheets). `step` draws the two-segment progress for a two-step sheet (approve, then review).
 * `footer` is the sticky foot; put its buttons in `SheetActions`. Focus is trapped, Esc closes,
 * focus returns to the opener, the page behind doesn't scroll. For a short confirmation with one
 * primary and a text link, use `ConfirmModal` instead.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  side = "end",
  width = "md",
  tone = "paper",
  hideTitle = false,
  step,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  side?: "end" | "center";
  /** sm 420, md 480 (the side sheet), wide 560 (Discover's side panel), lg 640. */
  width?: "sm" | "md" | "wide" | "lg";
  tone?: BlockTone;
  hideTitle?: boolean;
  /** Progress for a multi-step sheet: `{ current: 1, total: 2 }` is step 1 of 2. */
  step?: { current: number; total: number };
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const host = usePortalHost();
  useModal({ open, ready: Boolean(host), panelRef, onClose });

  if (!open || !host) return null;

  const widthClass =
    side === "center"
      ? { sm: "md:max-w-md", md: "md:max-w-lg", wide: "md:max-w-xl", lg: "md:max-w-2xl" }[width]
      : { sm: "md:w-[420px]", md: "md:w-[480px]", wide: "md:w-[560px]", lg: "md:w-[640px]" }[width];
  const placement =
    side === "center"
      ? `md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:-translate-x-1/2 md:-translate-y-1/2 md:max-h-[88dvh] md:rounded-(--y-r-sheet) ${widthClass}`
      : `md:inset-y-4 md:end-4 md:start-auto md:bottom-4 md:max-h-none md:rounded-(--y-r-sheet) ${widthClass}`;

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div className="y-scrim absolute inset-0" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        data-tone={tone}
        data-side={side}
        className={`y-sheet y-block absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-(--y-r-block) rounded-b-none outline-none ${placement}`}
      >
        <div className="flex justify-center pt-2 md:hidden" aria-hidden>
          <span className="y-grabber" />
        </div>
        <div
          className={`y-sheet-head ${hideTitle ? "!justify-end !border-b-0 !bg-transparent" : ""}`}
        >
          <div className={hideTitle ? "sr-only" : "flex min-w-0 flex-1 flex-col"}>
            <h2 id={titleId} className="y-display y-sheet-title">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="y-sheet-desc">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="y-round"
            data-tone-btn="soft"
            data-size="sm"
            aria-label="Close"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="y-sheet-body">
          {step ? <SheetSteps current={step.current} total={step.total} /> : null}
          {children}
        </div>
        {footer ? <div className="y-sheet-foot">{footer}</div> : null}
      </div>
    </div>,
    host,
  );
}

/** The thin segmented progress at the top of a multi-step sheet. */
function SheetSteps({ current, total }: { current: number; total: number }) {
  return (
    <div className="y-sheet-steps">
      <span className="sr-only">
        Step {current} of {total}
      </span>
      {Array.from({ length: total }, (_, index) => (
        <span key={index} aria-hidden data-on={index < current ? "true" : undefined} />
      ))}
    </div>
  );
}

/**
 * Footer buttons for a sheet (Work spec 6.10): a ghost pill first, then the primary, which fills
 * the rest of the row; both 50px. Order: secondary, primary.
 */
export function SheetActions({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`y-sheet-actions ${className}`}>{children}</div>;
}
