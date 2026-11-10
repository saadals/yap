"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { NewProductFlow, safeReturn } from "@/components/products/new-product-flow";
import { ProductSkeleton } from "@/components/products/product-page";
import { AppShell } from "@/components/shell/app-shell";
import { useDemo, useHydrated } from "@/lib/store";

/** Save a product once and reuse it in every order (a focused flow). `?return=` goes back to an order. */
export default function NewProductPage() {
  return (
    <AppShell focus>
      <Suspense fallback={<ProductSkeleton />}>
        <NewProduct />
      </Suspense>
    </AppShell>
  );
}

function NewProduct() {
  const params = useSearchParams();
  const hydrated = useHydrated();
  const s = useDemo();
  if (!hydrated) return <ProductSkeleton />;
  // Keyed by account so switching accounts starts a fresh form for the new buyer profile.
  return <NewProductFlow key={s.activeAccountId} returnTo={safeReturn(params.get("return"))} />;
}
