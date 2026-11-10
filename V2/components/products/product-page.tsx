"use client";

import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { sortItems } from "@/components/brand-home/order-items";
import { OrderRow } from "@/components/brand-home/order-row";
import { VideoThumb } from "@/components/domain/video-thumb";
import { libraryItems } from "@/components/library/data";
import { Block } from "@/components/ui/block";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { List } from "@/components/ui/list";
import { Page, PageHeader, SectionLabel } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { shortDate, timeAgoInline } from "@/lib/format";
import { omit } from "@/lib/omit";
import { paths } from "@/lib/paths";
import { me, productById } from "@/lib/selectors";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { nicheById } from "@/lib/taxonomy";
import type { Learning, Product } from "@/lib/types";

import { DeleteProductSheet } from "./delete-product-sheet";
import { EditProductSheet } from "./edit-product-sheet";
import { Learnings } from "./learnings";
import { productOrders } from "./product-orders";
import { surfaceOptions } from "./product-form";
import { AssetIcon, ProductMark } from "./product-mark";

const FEATURES_SHOWN = 3;
const ORDERS_SHOWN = 5;

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="y-micro y-fg-2 font-medium">{title}</h3>
      <div className="y-small">{children}</div>
    </div>
  );
}

function Lines({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="y-fg-2">{empty}</p>;
  return (
    <ul className="flex list-disc flex-col gap-1 ps-4 marker:text-(--b-fg-3)">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** What travels into every brief, as a creator reads it; the rest behind "Show the whole brief". */
function WhatCreatorsGet({ product, onEdit, onDelete }: { product: Product; onEdit: () => void; onDelete: () => void }) {
  const extraFeatures = product.features.length - FEATURES_SHOWN;
  return (
    <Block as="section" aria-labelledby="brief-title" tone="paper" pad="md" className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="brief-title" className="y-head">
          What creators get
        </h2>
        <PillButton variant="soft" size="sm" icon={<Pencil size={15} aria-hidden />} onClick={onEdit}>
          Edit
        </PillButton>
      </div>
      <Part title="Who it's for">
        <p>{product.audience}</p>
      </Part>
      <Part title="The problem it solves">
        <p>{product.problem}</p>
      </Part>
      <Part title="Features worth showing">
        <Lines items={product.features.slice(0, FEATURES_SHOWN)} empty="None listed yet." />
      </Part>

      <details className="group flex flex-col border-t border-(--b-line) pt-1">
        <summary className="y-small flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 font-medium [&::-webkit-details-marker]:hidden">
          Show the whole brief
          <ChevronDown size={18} aria-hidden className="transition-transform duration-(--y-dur-2) group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-5 pt-3">
          {extraFeatures > 0 ? (
            <Part title="More features">
              <Lines items={product.features.slice(FEATURES_SHOWN)} empty="" />
            </Part>
          ) : null}
          {product.description ? (
            <Part title="What it does">
              <p>{product.description}</p>
            </Part>
          ) : null}
          <Part title="Tone of voice">
            {product.tone.length ? (
              <span className="flex flex-wrap gap-1.5">
                {product.tone.map((tone) => (
                  <Chip key={tone}>{tone}</Chip>
                ))}
              </span>
            ) : (
              <p className="y-fg-2">Not set.</p>
            )}
          </Part>
          <div className="grid gap-5 sm:grid-cols-2">
            <Part title="Please do">
              <Lines items={product.dos} empty="Nothing listed." />
            </Part>
            <Part title="Please avoid">
              <Lines items={product.donts} empty="Nothing listed." />
            </Part>
          </div>
          <Part title="Call to action">
            <p>{product.cta || "Not set."}</p>
          </Part>
          <Part title="Files for the creator you hire">
            {product.assets.length ? (
              <ul className="flex flex-col gap-1.5">
                {product.assets.map((asset) => (
                  <li key={asset.id} className="flex items-center gap-2">
                    <AssetIcon kind={asset.kind} size={15} />
                    <span className="min-w-0 truncate">{asset.name}</span>
                    <span className="y-fg-2 flex-none">· {asset.size}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="y-fg-2">No files yet.</p>
            )}
          </Part>
        </div>
      </details>

      <div className="flex items-center justify-between gap-2 border-t border-(--b-line) pt-3">
        <p className="y-micro y-fg-2">Updated {timeAgoInline(product.updatedAt)}</p>
        <PillButton variant="ghost" size="sm" icon={<Trash2 size={15} aria-hidden />} onClick={onDelete} className="-me-2">
          Delete product
        </PillButton>
      </div>
    </Block>
  );
}

/**
 * /products/[id]: one saved product. The header's one action orders a video for it; the page shows
 * what creators get (editable in a sheet), the learnings that carry into every brief, the videos
 * made for it and its orders.
 */
export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const s = useDemo();
  const hydrated = useHydrated();
  const [deleted, setDeleted] = useState(false);
  const found = productById(s, id);
  // Products belong to a buyer profile: only the account that owns one can open it.
  const product = found && found.businessId === me.ids(s).businessId ? found : undefined;

  if (!hydrated || deleted) return <ProductSkeleton />;
  if (!product) {
    return (
      <Page width="narrow">
        <h1 className="sr-only">Product not found</h1>
        <Block tone="paper" pad="md" className="mt-4">
          <EmptyState
            shape="gem"
            tint="sun"
            face="sleepy"
            title="We couldn't find that product"
            body="It may have been deleted, or the link is from another account. Your saved products are all on one page."
            action={
              <PillButton href={paths.products} variant="contrast" arrow>
                See your products
              </PillButton>
            }
          />
        </Block>
      </Page>
    );
  }
  return <ProductView key={product.id} product={product} onDeleted={() => setDeleted(true)} />;
}

function ProductView({ product, onDeleted }: { product: Product; onDeleted: () => void }) {
  const s = useDemo();
  const toast = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [allOrders, setAllOrders] = useState(false);
  const liveRef = useRef(product);
  useEffect(() => {
    liveRef.current = product;
  }, [product]);

  const videos = libraryItems(s).filter((item) => item.product?.id === product.id);
  const orders = sortItems(productOrders(s, product.id));
  const surfaces = surfaceOptions.filter((o) => product.surfaces.includes(o.id)).map((o) => o.label);
  const facts = [nicheById[product.niche]?.name, surfaces.join(", "), product.website].filter(Boolean).join(" · ");

  const addLearning = (text: string) => {
    actions.addLearning(product.id, text);
    toast({ message: `Learning saved. It's in every new brief for ${product.name}.` });
  };
  const removeLearning = (learning: Learning, index: number) => {
    actions.removeLearning(product.id, learning.id);
    toast({
      message: "Learning removed",
      action: {
        label: "Undo",
        onClick: () => {
          const current = liveRef.current;
          if (current.learnings.some((l) => l.id === learning.id)) return;
          const restored = [...current.learnings];
          restored.splice(Math.min(index, restored.length), 0, learning);
          actions.saveProduct({ ...omit(current, ["businessId", "updatedAt"]), learnings: restored });
        },
      },
    });
  };

  return (
    <Page>
      <PageHeader
        back={{ href: paths.products, label: "Products" }}
        eyebrow={facts}
        title={
          <span className="flex items-center gap-3">
            <ProductMark product={product} size={36} />
            <span className="min-w-0">{product.name}</span>
          </span>
        }
        description={product.oneLiner}
        actions={
          <PillButton href={paths.newOrder({ product: product.id })} variant="neon" icon={<Plus size={18} aria-hidden />}>
            Order a video for this product
          </PillButton>
        }
      />

      <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-5 lg:col-start-8 lg:row-span-3 lg:row-start-1 lg:pt-[33px]">
          <WhatCreatorsGet product={product} onEdit={() => setEditing(true)} onDelete={() => setDeleting(true)} />
        </div>

        <section aria-labelledby="learnings-title" className="min-w-0 lg:col-span-7 lg:col-start-1 lg:row-start-1">
          <SectionLabel id="learnings-title" className="lg:!pt-0">
            Learnings {product.learnings.length ? <span className="y-fg-2 y-num font-normal">{product.learnings.length}</span> : null}
          </SectionLabel>
          <Block tone="paper" pad="md" className="flex flex-col gap-4">
            <p className="y-small y-fg-2">Every new brief for {product.name} includes these, so creators start from what worked.</p>
            <Learnings live learnings={product.learnings} onAdd={addLearning} onRemove={removeLearning} />
          </Block>
        </section>

        <section aria-labelledby="videos-title" className="min-w-0 lg:col-span-7 lg:col-start-1">
          <SectionLabel
            id="videos-title"
            action={
              videos.length ? (
                <Link href={paths.library({ product: product.id })} className="y-small y-link font-medium">
                  See all in the Library
                </Link>
              ) : undefined
            }
          >
            Videos made {videos.length ? <span className="y-fg-2 y-num font-normal">{videos.length}</span> : null}
          </SectionLabel>
          {videos.length ? (
            <ul className="grid grid-cols-4 gap-2 sm:gap-3">
              {videos.slice(0, 4).map((item) => (
                <li key={item.id} className="min-w-0">
                  <Link
                    href={paths.library({ video: item.id })}
                    className="group flex flex-col gap-1.5"
                    aria-label={`${item.commission.title}, by ${item.creator?.name ?? "a creator"}`}
                  >
                    <VideoThumb video={item.video} frame="9:16" showHook={false} showViews={false} playable decorative />
                    <span className="y-micro y-fg-2 truncate px-0.5">
                      {item.creator?.firstName ?? "Creator"} · {shortDate(item.approvedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Block tone="paper" pad="md">
              <p className="y-small y-fg-2">No approved videos yet. When you approve one, it shows up here and in your Library.</p>
            </Block>
          )}
        </section>

        <section aria-labelledby="orders-title" className="min-w-0 lg:col-span-7 lg:col-start-1">
          <SectionLabel id="orders-title">
            Orders {orders.length ? <span className="y-fg-2 y-num font-normal">{orders.length}</span> : null}
          </SectionLabel>
          {orders.length ? (
            <List label={`Orders for ${product.name}`}>
              {(allOrders ? orders : orders.slice(0, ORDERS_SHOWN)).map((item) => (
                <OrderRow key={item.key} item={item} />
              ))}
              {!allOrders && orders.length > ORDERS_SHOWN ? (
                <button
                  type="button"
                  role="listitem"
                  onClick={() => setAllOrders(true)}
                  className="y-row y-small !min-h-12 justify-center font-medium"
                >
                  Show all {orders.length} orders
                </button>
              ) : null}
            </List>
          ) : (
            <Block tone="paper" pad="md">
              <p className="y-small y-fg-2">
                No orders for {product.name} yet. Your first brief starts from everything on this page.
              </p>
            </Block>
          )}
        </section>
      </div>

      <EditProductSheet product={product} open={editing} onClose={() => setEditing(false)} />
      <DeleteProductSheet
        product={product}
        open={deleting}
        onClose={() => setDeleting(false)}
        onDeleted={() => {
          onDeleted();
          router.replace(paths.products);
        }}
      />
    </Page>
  );
}

export function ProductSkeleton() {
  return (
    <Page>
      <div className="flex flex-col gap-3 pb-6" aria-busy="true" aria-label="Loading product">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-12" aria-hidden>
        <div className="flex flex-col gap-3 lg:col-span-7">
          <Skeleton className="h-72 w-full !rounded-(--y-r-block)" />
          <Skeleton className="h-48 w-full !rounded-(--y-r-block)" />
        </div>
        <Skeleton className="h-96 w-full !rounded-(--y-r-block) lg:col-span-5" />
      </div>
    </Page>
  );
}
