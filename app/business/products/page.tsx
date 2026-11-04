"use client";

import { FilePlus2, Lightbulb, Package, Plus } from "lucide-react";

import { ProductCard } from "@/components/products/product-card";
import { AppShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { Page, PageHeader, SectionLabel } from "@/components/ui/page";
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

const steps = [
  {
    icon: Package,
    title: "Saved once",
    body: "Audience, problem, tone, dos and don'ts, files and a demo login. Written one time.",
  },
  {
    icon: FilePlus2,
    title: "Reused in every brief",
    body: "Pick the product when you post a request or commission someone. The brief fills itself in.",
  },
  {
    icon: Lightbulb,
    title: "Learnings carried forward",
    body: "When you approve a video, note what worked. The next creator sees it before they film.",
  },
];

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
        description="Saved once, reused in every brief — and what you learn from each video is kept here."
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
            <div key={key} data-tone="paper" className="y-block y-pad-md flex flex-col gap-5" aria-hidden>
              <div className="flex items-center gap-4">
                <Skeleton className="size-14 !rounded-[18px]" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
              <Skeleton className="h-10 w-2/3" />
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

      <SectionLabel>How product context works</SectionLabel>
      <ol className="grid gap-2 md:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title}>
              <Block tone="paper" pad="md" className="flex h-full flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="y-round" data-tone-btn="soft" aria-hidden>
                    <Icon size={20} />
                  </span>
                  <span className="y-display y-num y-fg-3 text-[28px] font-semibold" aria-hidden>
                    {index + 1}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="y-head">{step.title}</h3>
                  <p className="y-small y-fg-2">{step.body}</p>
                </div>
              </Block>
            </li>
          );
        })}
      </ol>
    </Page>
  );
}
