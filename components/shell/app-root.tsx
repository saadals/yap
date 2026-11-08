"use client";

import { useEffect } from "react";

import { PrefsProvider } from "@/lib/prefs";
import { simulationTick } from "@/lib/store";
import { ToastProvider } from "@/components/ui/toast";

/** Drives simulated campaign activity (other creators joining, uploading, posting). */
function useSimulation() {
  useEffect(() => {
    const timer = window.setInterval(simulationTick, 2500);
    return () => window.clearInterval(timer);
  }, []);
}

/** Scoping class, font variables, toasts. Portals (sheets) mount into #yapp-root. */
export function AppRoot({
  fontStyle,
  children,
}: {
  fontStyle: React.CSSProperties;
  children: React.ReactNode;
}) {
  useSimulation();
  return (
    <PrefsProvider>
      <div id="yapp-root" className="yapp" style={fontStyle}>
        <a
          href="#main"
          className="y-pill sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[120]"
          data-variant="contrast"
        >
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </div>
    </PrefsProvider>
  );
}
