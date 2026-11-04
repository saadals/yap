"use client";

import { Plus } from "lucide-react";

import { ProductCard } from "@/components/products/product-card";
import { AppShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { ME, useDemo, useHydrated } from "@/lib/store";

export default function ProductsPage() {
  return (
    <AppShell role="business">
      <Products />
    </AppShell>
  );
}

function Products() {
  const s = useDemo();
  const hydrated = useHydrated();
  const products = s.products
    .filter((p) => p.businessId === ME.businessId)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  return (
    <Page>
      <PageHeader
        title="Products"
        description="Saved once and reused in every brief, with what each video taught you."
        actions={
          products.length ? (
            <PillButton
              href="/business/products/new"
              variant="neon"
              arrow
              icon={<Plus size={18} aria-hidden />}
            >
              Add product
            </PillButton>
          ) : null
        }
      />

      {!hydrated ? (
        <div className="grid gap-2 lg:grid-cols-2" aria-busy="true" aria-label="Loading products">
          {[0, 1].map((key) => (
            <div key={key} data-tone="paper" className="y-block y-pad-md flex items-center gap-4" aria-hidden>
              <Skeleton className="size-12 !rounded-[16px]" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length ? (
        <ul className="grid gap-2 lg:grid-cols-2">
          {products.map((product) => (
            <li key={product.id} className="flex">
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      ) : (
        <Block tone="paper" pad="md">
          <EmptyState
            shape="bean"
            tint="mint"
            face="smile"
            title="Add your first product"
            body="Describe your app once: who it's for, the problem, the tone. Every brief you send starts from it, so creators never have to ask twice."
            action={
              <PillButton href="/business/products/new" variant="neon" arrow icon={<Plus size={18} aria-hidden />}>
                Add product
              </PillButton>
            }
          />
        </Block>
      )}
    </Page>
  );
}
