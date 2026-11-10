"use client";

import Link from "next/link";
import { useId, useRef } from "react";
import { createPortal } from "react-dom";

import { useModal, usePortalHost } from "./dialog";
import { PillButton } from "./pill-button";

/**
 * Centred confirmation modal (Work spec 6.7.3, Site-wide 5.5.3), and a bottom sheet on phones:
 * a 24px title, a short body, optional fields, one full-width primary pill and an optional text
 * link under it. No illustration (round 3 answers, item 15). Focus goes to the title on open, Esc
 * and the scrim close it, focus returns to the trigger. The primary is dark by default; use
 * `tone: "neon"` only when the modal is the page's one green action (e.g. "Pick now").
 * Validation stays with the caller: `primary.onClick` decides whether to close.
 *
 * Variants on this template: "Pick a Yapp from {brand}?", "The slot is yours", "Pitch to {brand}",
 * "Pitch sent", "Version N is with {brand}", "Approved · $570 released", "{product} is live",
 * "Offer sent", "You're hired", "Payout on its way", "Post verified".
 */
export function ConfirmModal({
  open,
  onClose,
  title,
  children,
  fields,
  primary,
  link,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** The body: one or two sentences. Bold the amounts and dates that matter. */
  children?: React.ReactNode;
  /** Optional fields between the body and the buttons (a pitch's idea and price). */
  fields?: React.ReactNode;
  primary: {
    label: React.ReactNode;
    onClick: () => void;
    tone?: "contrast" | "neon";
    disabled?: boolean;
    "aria-label"?: string;
  };
  /** Text link under the primary: "View order", "Not now", "Keep browsing". Defaults to closing. */
  link?: { label: React.ReactNode; onClick?: () => void; href?: string };
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const host = usePortalHost();
  useModal({ open, ready: Boolean(host), panelRef, onClose, initialFocusRef: titleRef });

  if (!open || !host) return null;

  return createPortal(
    <div className="fixed inset-0 z-[85]">
      <div className="y-scrim absolute inset-0" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={children ? bodyId : undefined}
        tabIndex={-1}
        data-tone="paper"
        data-side="center"
        className="y-sheet y-block absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-y-auto rounded-t-(--y-r-block) rounded-b-none outline-none [box-shadow:var(--y-shadow-modal)] md:inset-auto md:top-1/2 md:left-1/2 md:max-h-[88dvh] md:w-[440px] md:max-w-[calc(100vw-32px)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-(--y-r-sheet)"
      >
        <div className="flex justify-center pt-2 md:hidden" aria-hidden>
          <span className="y-grabber" />
        </div>
        <div className="y-confirm">
          <h2 ref={titleRef} id={titleId} tabIndex={-1} className="y-display y-confirm-title">
            {title}
          </h2>
          {children ? (
            <div id={bodyId} className="y-confirm-body">
              {children}
            </div>
          ) : (
            <div className="h-5" aria-hidden />
          )}
          {fields ? <div className="y-confirm-fields">{fields}</div> : null}
          <PillButton
            variant={primary.tone ?? "contrast"}
            onClick={primary.onClick}
            disabled={primary.disabled}
            aria-label={primary["aria-label"]}
            className="y-confirm-primary"
          >
            {primary.label}
          </PillButton>
          {link ? (
            link.href ? (
              <Link href={link.href} onClick={link.onClick} className="y-confirm-link">
                {link.label}
              </Link>
            ) : (
              <button type="button" onClick={link.onClick ?? onClose} className="y-confirm-link">
                {link.label}
              </button>
            )
          ) : null}
        </div>
      </div>
    </div>,
    host,
  );
}
