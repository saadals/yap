"use client";

import { BrandToday } from "@/components/brand-home/today";
import { AppShell } from "@/components/shell/app-shell";

/** Ordering's Home: what needs you, what's in progress, start an order, your latest videos. */
export default function HomePage() {
  return (
    <AppShell>
      <BrandToday />
    </AppShell>
  );
}
