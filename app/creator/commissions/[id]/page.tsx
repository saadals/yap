"use client";

import { useParams } from "next/navigation";

import { CommissionWorkspace } from "@/components/commission/commission-workspace";
import { AppShell } from "@/components/shell/app-shell";

export default function CreatorCommissionPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <AppShell role="creator">
      <CommissionWorkspace id={id} role="creator" />
    </AppShell>
  );
}
