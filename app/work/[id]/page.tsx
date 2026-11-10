"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";

import { CommissionWorkspace } from "@/components/commission/commission-workspace";
import { AppShell } from "@/components/shell/app-shell";

/** One order in progress for whoever is looking: the side (ordering or making) comes from the account. */
export default function CommissionPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <AppShell>
      {/* The order page reads ?version=, ?comment= and ?tab= (useSearchParams needs a boundary). */}
      <Suspense fallback={null}>
        <CommissionWorkspace id={id} />
      </Suspense>
    </AppShell>
  );
}
