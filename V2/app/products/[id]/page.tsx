"use client";

import { ProductPage } from "@/components/products/product-page";
import { AppShell } from "@/components/shell/app-shell";

/** One product: what creators get, learnings, videos made and orders. */
export default function Product() {
  return (
    <AppShell>
      <ProductPage />
    </AppShell>
  );
}
