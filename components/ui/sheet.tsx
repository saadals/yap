"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import type { BlockTone } from "./block";

const subscribeNoop = () => () => {};

const focusable =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal sheet: bottom sheet on mobile, end-side panel or centred dialog from 768px.
 * Focus is trapped, Esc closes, focus returns to the opener, the page behind is inert to scroll.
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
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  side?: "end" | "center";
  width?: "sm" | "md" | "lg";
  tone?: BlockTone;
  hideTitle?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const host = useSyncExternalStore(
    subscribeNoop,
    () => document.getElementById("yapp-root") ?? document.body,
    () => null,
  );
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel;
    first?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(focusable)).filter(
        (node) => node.offsetParent !== null,
      );
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === firstItem || document.activeElement === panel)
      ) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [open, host]);

  if (!open || !host) return null;

  const widthClass =
    side === "center"
      ? { sm: "md:max-w-md", md: "md:max-w-lg", lg: "md:max-w-2xl" }[width]
      : { sm: "md:w-[420px]", md: "md:w-[520px]", lg: "md:w-[640px]" }[width];
  const placement =
    side === "center"
      ? `md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:-translate-x-1/2 md:-translate-y-1/2 md:max-h-[88dvh] md:rounded-(--y-r-sheet) ${widthClass}`
      : `md:inset-y-2 md:end-2 md:start-auto md:bottom-2 md:max-h-none md:rounded-(--y-r-sheet) ${widthClass}`;

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
          className={`flex items-start gap-3 px-5 pt-3 pb-2 md:px-7 md:pt-6 ${hideTitle ? "justify-end" : ""}`}
        >
          <div className={hideTitle ? "sr-only" : "flex min-w-0 flex-1 flex-col gap-1"}>
            <h2 id={titleId} className="y-display y-title">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="y-small y-fg-2">
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
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 md:px-7 md:pb-7">{children}</div>
        {footer ? (
          <div className="y-safe-bottom border-t border-(--b-line) px-5 pt-3 md:px-7 md:pb-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    host,
  );
}
