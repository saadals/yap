"use client";

import { EarningsPage } from "@/components/earnings/earnings-page";
import { AppShell } from "@/components/shell/app-shell";

export default function StudioEarningsRoute() {
  return (
    <AppShell>
      <EarningsPage />
    </AppShell>
  );
}
