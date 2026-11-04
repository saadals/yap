"use client";

import { Check, Info } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastInput = {
  message: string;
  tone?: "success" | "info";
  action?: { label: string; onClick: () => void };
};
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      setItems((current) => [...current.slice(-2), { ...toast, id }]);
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), toast.action ? 6000 : 3800),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+96px)] z-[90] flex flex-col items-center gap-2 px-3 md:bottom-6"
      >
        {items.map((item) => (
          <div
            key={item.id}
            data-tone="night"
            className="y-toast y-block pointer-events-auto flex min-h-14 w-full max-w-md items-center gap-3 !rounded-full py-2 ps-2 pe-2 shadow-(--y-shadow-float)"
          >
            <span
              aria-hidden
              className={`grid size-10 flex-none place-items-center rounded-full ${
                item.tone === "info"
                  ? "bg-(--y-sky) text-(--y-on-color)"
                  : "bg-(--y-neon) text-(--y-on-color)"
              }`}
            >
              {item.tone === "info" ? <Info size={18} /> : <Check size={18} strokeWidth={2.5} />}
            </span>
            <p className="y-small flex-1 font-medium">{item.message}</p>
            {item.action ? (
              <button
                type="button"
                className="y-pill"
                data-size="sm"
                data-variant="contrast"
                onClick={() => {
                  item.action?.onClick();
                  dismiss(item.id);
                }}
              >
                {item.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
