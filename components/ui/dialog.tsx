"use client";

import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";

const subscribeNoop = () => () => {};

export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Where dialogs mount: #yapp-root (inside `.yapp`, so the tokens apply). Null on the server. */
export function usePortalHost(): HTMLElement | null {
  return useSyncExternalStore(
    subscribeNoop,
    () => document.getElementById("yapp-root") ?? document.body,
    () => null,
  );
}

/** Open modals, newest last: only the top one answers Esc and keeps Tab inside. */
const stack: symbol[] = [];
/** The page's own overflow, saved when the first modal opens and restored when the last closes. */
let savedOverflow = "";

/**
 * Shared modal behaviour for `Sheet` and `ConfirmModal`: moves focus in (to `[data-autofocus]`,
 * then `initialFocus`, then the panel), traps Tab, closes on Esc (only the top-most modal when two
 * are open), locks page scroll, and returns focus to whatever opened it.
 */
export function useModal({
  open,
  ready,
  panelRef,
  onClose,
  initialFocusRef,
}: {
  open: boolean;
  /** The panel is in the DOM (the portal host exists). */
  ready: boolean;
  panelRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
}) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || !ready) return;
    const id = Symbol("modal");
    if (stack.length === 0) savedOverflow = document.body.style.overflow;
    stack.push(id);
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first =
      panel?.querySelector<HTMLElement>("[data-autofocus]") ?? initialFocusRef?.current ?? panel;
    first?.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null,
      );
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === firstItem || !panel.contains(active))) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && (active === lastItem || !panel.contains(active))) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const at = stack.indexOf(id);
      if (at >= 0) stack.splice(at, 1);
      if (stack.length === 0) document.body.style.overflow = savedOverflow;
      opener?.focus?.({ preventScroll: true });
    };
  }, [open, ready, panelRef, initialFocusRef]);
}
