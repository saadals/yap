"use client";

import { PrefsProvider, type SessionRole, type Theme } from "@/lib/prefs";
import { ToastProvider } from "@/components/ui/toast";

/** Scoping class, font variables, toasts. Portals (sheets) mount into #yapp-root. */
export function AppRoot({
  theme,
  role,
  fontStyle,
  children,
}: {
  theme: Theme;
  role: SessionRole;
  fontStyle: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <PrefsProvider initialTheme={theme} initialRole={role}>
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
