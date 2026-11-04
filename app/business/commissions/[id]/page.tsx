"use client";

import { useParams } from "next/navigation";

import { CommissionWorkspace } from "@/components/commission/commission-workspace";
import { AppShell } from "@/components/shell/app-shell";

export default function BusinessCommissionPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <AppShell role="business">
      <CommissionWorkspace id={id} role="business" />
    </AppShell>
  );
}
