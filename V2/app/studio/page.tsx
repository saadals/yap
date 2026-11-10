"use client";

import { AppShell } from "@/components/shell/app-shell";
import { StudioToday } from "@/components/studio-home/studio-today";

/** Studio Home ("Today"); without a creator profile, the Studio welcome and setup. */
export default function Studio() {
  return (
    <AppShell>
      <StudioToday />
    </AppShell>
  );
}
