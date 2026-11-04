"use client";

import { CommissionList } from "@/components/commission/commission-list";
import { AppShell } from "@/components/shell/app-shell";

export default function BusinessCommissionsPage() {
  return (
    <AppShell role="business">
      <CommissionList role="business" />
    </AppShell>
  );
}
