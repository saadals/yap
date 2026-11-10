"use client";

import { Suspense } from "react";

import { LibraryPage } from "@/components/library/library-page";
import { AppShell } from "@/components/shell/app-shell";

/** Every approved video for your products. */
export default function Library() {
  return (
    <AppShell>
      <Suspense>
        <LibraryPage />
      </Suspense>
    </AppShell>
  );
}
