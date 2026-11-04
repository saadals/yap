"use client";

import { Suspense } from "react";

import { Browse } from "@/components/discovery/browse";
import { BrowseSkeleton } from "@/components/discovery/skeletons";
import { PublicShell } from "@/components/shell/app-shell";
import { Page } from "@/components/ui/page";

export default function CreatorsPage() {
  return (
    <PublicShell>
      <Page>
        <Suspense fallback={<BrowseSkeleton />}>
          <Browse />
        </Suspense>
      </Page>
    </PublicShell>
  );
}
