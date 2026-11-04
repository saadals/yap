"use client";

import { CommissionList } from "@/components/commission/commission-list";
import { AppShell } from "@/components/shell/app-shell";

export default function CreatorCommissionsPage() {
  return (
    <AppShell role="creator">
      <CommissionList role="creator" />
    </AppShell>
  );
}
