"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";

import { CommissionRoute } from "@/components/discovery/checkout/checkout";
import { normalizeHandle } from "@/components/discovery/profile";
import { CheckoutSkeleton } from "@/components/discovery/skeletons";
import { PublicShell } from "@/components/shell/app-shell";
import { Page } from "@/components/ui/page";

export default function CommissionPage() {
  const params = useParams<{ handle: string }>();
  const handle = normalizeHandle(params.handle);
  return (
    <PublicShell footer="none" bottomBar={false}>
      <Page>
        <Suspense fallback={<CheckoutSkeleton />}>
          <CommissionRoute handle={handle} />
        </Suspense>
      </Page>
    </PublicShell>
  );
}
