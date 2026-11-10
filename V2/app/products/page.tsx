"use client";

import { ProductsPage } from "@/components/products/products-page";
import { AppShell } from "@/components/shell/app-shell";

/** Saved product context that every brief reuses. */
export default function Products() {
  return (
    <AppShell>
      <ProductsPage />
    </AppShell>
  );
}
