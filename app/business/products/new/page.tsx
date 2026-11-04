"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { EditorSkeleton } from "@/components/products/editor-skeleton";
import { ProductEditor, safeReturn } from "@/components/products/product-editor";
import { AppShell } from "@/components/shell/app-shell";
import { useHydrated } from "@/lib/store";

export default function NewProductPage() {
  return (
    <AppShell role="business" focus>
      <Suspense fallback={<EditorSkeleton />}>
        <NewProduct />
      </Suspense>
    </AppShell>
  );
}

function NewProduct() {
  const params = useSearchParams();
  const hydrated = useHydrated();
  if (!hydrated) return <EditorSkeleton />;
  return <ProductEditor returnTo={safeReturn(params.get("return"))} />;
}
