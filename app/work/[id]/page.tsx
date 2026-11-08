"use client";

import { useParams } from "next/navigation";

import { CommissionWorkspace } from "@/components/commission/commission-workspace";
import { AppShell } from "@/components/shell/app-shell";

/** One commission for whoever is looking: the side (ordering or making) comes from the account. */
export default function CommissionPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <AppShell>
      <CommissionWorkspace id={id} />
    </AppShell>
  );
}
