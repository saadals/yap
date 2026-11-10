"use client";

import { Plus } from "lucide-react";

import { RowLink } from "@/components/brand-home/row-link";
import { libraryItems } from "@/components/library/data";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { List } from "@/components/ui/list";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { plural, timeAgoInline } from "@/lib/format";
import { paths } from "@/lib/paths";
import { me } from "@/lib/selectors";
import { type DemoState, useDemo, useHydrated } from "@/lib/store";
import type { Product } from "@/lib/types";

import { productOrders } from "./product-orders";
import { ProductMark } from "./product-mark";

/** "4 learnings · 4 videos · 10 orders · Updated Oct 29" */
function productLine(s: DemoState, product: Product, videos: number) {
  const orders = productOrders(s, product.id).length;
  return [
    product.learnings.length ? plural(product.learnings.length, "learning") : "No learnings yet",
    videos ? plural(videos, "video") : null,
    orders ? plural(orders, "order") : "Not ordered yet",
    `Updated ${timeAgoInline(product.updatedAt)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** /products: the products saved for this buyer profile, most recently updated first. */
export function ProductsPage() {
  const s = useDemo();
  const hydrated = useHydrated();
  const businessId = me.ids(s).businessId;
  const products = s.products
    .filter((p) => p.businessId === businessId)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const videos = hydrated ? libraryItems(s) : [];

  const addButton = (
    <PillButton href={paths.newProduct} variant="neon" icon={<Plus size={18} aria-hidden />}>
      Add product
    </PillButton>
  );

  return (
    <Page>
      <PageHeader
        back={{ href: paths.library(), label: "Library" }}
        title="Products"
        description="Saved once and reused in every brief, with what each video taught you."
        actions={hydrated && products.length ? addButton : null}
      />

      {!hydrated ? (
        <div data-tone="paper" className="y-block flex flex-col" aria-busy="true" aria-label="Loading products">
          {[0, 1].map((key) => (
            <div key={key} className="flex items-center gap-4 border-b border-(--b-line) px-5 py-4 last:border-0" aria-hidden>
              <Skeleton className="size-10 !rounded-[12px]" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length ? (
        <List label="Products">
          {products.map((product) => (
            <RowLink
              key={product.id}
              href={paths.product(product.id)}
              lead={<ProductMark product={product} size={40} />}
              title={product.name}
              meta={product.oneLiner}
              below={
                <span className="y-micro y-fg-2 block truncate">
                  {productLine(s, product, videos.filter((v) => v.product?.id === product.id).length)}
                </span>
              }
            />
          ))}
        </List>
      ) : (
        <Block tone="paper" pad="md">
          <EmptyState
            shape="bean"
            tint="mint"
            face="smile"
            title="Add your first product"
            body="Describe what you're promoting once: who it's for, the problem, the tone. Every order starts from it, so creators never have to ask twice."
            action={addButton}
          />
        </Block>
      )}
    </Page>
  );
}
