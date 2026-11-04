"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { EditorSkeleton } from "@/components/products/editor-skeleton";
import { ProductEditor } from "@/components/products/product-editor";
import { AppShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { productById } from "@/lib/selectors";
import { ME, useDemo, useHydrated } from "@/lib/store";

export default function ProductPage() {
  return (
    <AppShell role="business" focus>
      <Product />
    </AppShell>
  );
}

function Product() {
  const { id } = useParams<{ id: string }>();
  const s = useDemo();
  const hydrated = useHydrated();
  const [deleted, setDeleted] = useState(false);
  const found = productById(s, id);
  const product = found && found.businessId === ME.businessId ? found : undefined;

  if (!hydrated || deleted) return <EditorSkeleton />;

  if (!product) {
    return (
      <Page width="narrow">
        <h1 className="sr-only">Product not found</h1>
        <Block tone="paper" pad="md" className="mt-4">
          <EmptyState
            shape="gem"
            tint="sun"
            face="sleepy"
            headingLevel={2}
            title="We couldn't find that product"
            body="It may have been deleted, or the link is from another account. Your saved products are all on one page."
            action={
              <PillButton href="/business/products" variant="neon" arrow>
                See your products
              </PillButton>
            }
          />
        </Block>
      </Page>
    );
  }

  return <ProductEditor key={product.id} product={product} onDeleted={() => setDeleted(true)} />;
}
