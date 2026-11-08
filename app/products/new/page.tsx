"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { EditorSkeleton } from "@/components/products/editor-skeleton";
import { ProductEditor, safeReturn } from "@/components/products/product-editor";
import { AppShell } from "@/components/shell/app-shell";
import { useDemo, useHydrated } from "@/lib/store";

export default function NewProductPage() {
  return (
    <AppShell focus>
      <Suspense fallback={<EditorSkeleton />}>
        <NewProduct />
      </Suspense>
    </AppShell>
  );
}

function NewProduct() {
  const params = useSearchParams();
  const hydrated = useHydrated();
  const s = useDemo();
  if (!hydrated) return <EditorSkeleton />;
  // Keyed by account so switching accounts starts a fresh form for the new buyer profile.
  return <ProductEditor key={s.activeAccountId} returnTo={safeReturn(params.get("return"))} />;
}
