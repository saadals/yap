"use client";

import { ArrowLeft, Check, FilePlus2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Block } from "@/components/ui/block";
import { Celebrate } from "@/components/ui/celebrate";
import { SelectField, TextArea, TextField } from "@/components/ui/field";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { NOW_ISO } from "@/lib/clock";
import { plural, timeAgo } from "@/lib/format";
import { omit } from "@/lib/omit";
import { historyForProduct, isActive, me, productById } from "@/lib/selectors";
import { ME, actions, useDemo } from "@/lib/store";
import { niches } from "@/lib/taxonomy";
import type { Learning, Product, ProductAsset } from "@/lib/types";

import { AssetsEditor } from "./assets-editor";
import { LearningsEditor } from "./learnings-editor";
import { ListEditor } from "./list-editor";
import {
  type FieldErrors,
  type ProductForm,
  type RequiredField,
  brandPalette,
  emptyForm,
  fieldOrder,
  formFromProduct,
  sameForm,
  surfaceOptions,
  toSaveInput,
  validate,
} from "./product-form";
import { ProductHistory } from "./product-history";
import { ProductPreview } from "./product-preview";
import { TonePicker } from "./tone-picker";

/* -------------------------------------------------------------------------- */
/* Small pieces                                                                */
/* -------------------------------------------------------------------------- */

function Section({
  id,
  title,
  description,
  aside,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Block
      as="section"
      id={id}
      aria-labelledby={`${id}-title`}
      tone="paper"
      pad="md"
      className="flex scroll-mt-24 flex-col gap-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex max-w-[62ch] flex-col gap-1">
          <h2 id={`${id}-title`} className="y-display y-title">
            {title}
          </h2>
          {description ? <p className="y-small y-fg-2">{description}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </Block>
  );
}

/** Link styled as a system pill that can be intercepted by the unsaved-changes guard. */
function GuardedLink({
  href,
  onNavigate,
  className,
  variant,
  children,
}: {
  href: string;
  onNavigate: (event: React.MouseEvent, href: string) => void;
  className: string;
  variant?: "soft" | "outline";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={(event) => onNavigate(event, href)}
      className={className}
      data-variant={variant}
      data-size={variant ? "sm" : undefined}
    >
      {children}
    </Link>
  );
}

const sectionFields: { label: string; keys: (keyof ProductForm)[] }[] = [
  { label: "Basics", keys: ["name", "oneLiner", "website", "niche", "surfaces", "brandColor"] },
  { label: "The story", keys: ["problem", "audience", "description", "features"] },
  { label: "Voice", keys: ["tone", "dos", "donts", "cta"] },
  { label: "Files", keys: ["assets"] },
];

function changedSections(a: ProductForm, b: ProductForm): string[] {
  return sectionFields
    .filter((section) => section.keys.some((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key])))
    .map((section) => section.label);
}

/** Only same-site paths are allowed as a return target. */
export function safeReturn(path: string | null): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

function withProduct(path: string, productId: string) {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("product", productId);
  return `${base}?${params.toString()}`;
}

/** "Yesterday" → "yesterday"; dates ("7 Nov") keep their case. */
const lowerAgo = (iso: string) => {
  const ago = timeAgo(iso);
  return ago === "Yesterday" ? "yesterday" : ago;
};

const jump = [
  { id: "basics", label: "Basics" },
  { id: "story", label: "The story" },
  { id: "voice", label: "Voice" },
  { id: "files", label: "Files" },
  { id: "learnings", label: "Learnings" },
];

/* -------------------------------------------------------------------------- */
/* Editor                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * One editor for new and existing products. Fields save together on Save; learnings on a saved
 * product apply immediately (they're shared history, not draft copy).
 */
export function ProductEditor({
  product,
  returnTo = null,
  onDeleted,
}: {
  product?: Product;
  returnTo?: string | null;
  onDeleted?: () => void;
}) {
  const s = useDemo();
  const router = useRouter();
  const toast = useToast();
  const business = me.business(s);
  const formRef = useRef<HTMLFormElement>(null);
  const colorId = useId();
  const surfacesId = useId();

  const [baseline, setBaseline] = useState<ProductForm>(() =>
    product ? formFromProduct(product) : emptyForm(business.industry),
  );
  const [form, setForm] = useState<ProductForm>(baseline);
  const [touched, setTouched] = useState<Partial<Record<keyof FieldErrors, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [localLearnings, setLocalLearnings] = useState<Learning[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);

  const live = product ? productById(s, product.id) : undefined;
  const liveRef = useRef(live);
  useEffect(() => {
    liveRef.current = live;
  }, [live]);

  const learnings = product ? (live?.learnings ?? []) : localLearnings;
  const errors = validate(form);
  const errorFor = (field: keyof FieldErrors) =>
    submitted || touched[field] ? errors[field] : undefined;
  const dirty = !sameForm(form, baseline) || (!product && localLearnings.length > 0);
  const name = form.name.trim() || "this product";

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const touch = (field: RequiredField | "website") =>
    setTouched((current) => (current[field] ? current : { ...current, [field]: true }));

  /* --------------------------------------------------------------- save */

  const save = (after?: string): boolean => {
    setSubmitted(true);
    const result = validate(form);
    const first = fieldOrder.find((field) => result[field]);
    if (first) {
      const count = fieldOrder.filter((field) => result[field]).length;
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      toast({
        message: `Check ${count === 1 ? "the highlighted field" : `the ${count} highlighted fields`} before saving.`,
        tone: "info",
      });
      return false;
    }
    const id = actions.saveProduct(
      toSaveInput(form, { id: product?.id, learnings: product ? undefined : localLearnings }),
    );
    setBaseline(form);
    setLocalLearnings([]);
    if (!product && returnTo && (!after || after === returnTo)) {
      toast({ message: `${form.name.trim()} saved. It's now selected in your request.` });
      router.push(withProduct(returnTo, id));
    } else if (after) {
      toast({ message: `Saved ${form.name.trim()}` });
      router.push(after);
    } else if (product) {
      toast({ message: `Saved. New briefs for ${form.name.trim()} use this from now on.` });
    } else {
      toast({ message: `${form.name.trim()} saved` });
      setCreated({ id, name: form.name.trim() });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return true;
  };

  /* --------------------------------------------------------- navigation */

  const backHref = returnTo ?? "/business/products";
  const guard = (event: React.MouseEvent, href: string) => {
    if (!dirty) return;
    event.preventDefault();
    setPending(href);
  };

  /* ---------------------------------------------------------- learnings */

  const addLearning = (text: string) => {
    if (product) {
      actions.addLearning(product.id, text);
      toast({ message: `Learning saved. It's in every new brief for ${product.name}.` });
    } else {
      setLocalLearnings((current) => [
        { id: `l-local-${Date.now().toString(36)}`, text, createdAt: NOW_ISO },
        ...current,
      ]);
    }
  };

  const removeLearning = (learning: Learning, index: number) => {
    if (product) {
      actions.removeLearning(product.id, learning.id);
      toast({
        message: "Learning removed",
        action: {
          label: "Undo",
          onClick: () => {
            const current = liveRef.current;
            if (!current || current.learnings.some((l) => l.id === learning.id)) return;
            const restored = [...current.learnings];
            restored.splice(Math.min(index, restored.length), 0, learning);
            actions.saveProduct({ ...omit(current, ["businessId", "updatedAt"]), learnings: restored });
          },
        },
      });
    } else {
      setLocalLearnings((current) => current.filter((l) => l.id !== learning.id));
      toast({
        message: "Learning removed",
        action: {
          label: "Undo",
          onClick: () =>
            setLocalLearnings((current) => {
              const next = [...current];
              next.splice(Math.min(index, next.length), 0, learning);
              return next;
            }),
        },
      });
    }
  };

  /* ------------------------------------------------------------- assets */

  const addAssets = (assets: ProductAsset[]) => {
    setForm((current) => ({ ...current, assets: [...current.assets, ...assets] }));
    toast({
      message: `Added ${assets.length === 1 ? assets[0].name : plural(assets.length, "file")}. Save to keep ${assets.length === 1 ? "it" : "them"}.`,
    });
  };
  const removeAsset = (asset: ProductAsset, index: number) => {
    setForm((current) => ({ ...current, assets: current.assets.filter((a) => a.id !== asset.id) }));
    toast({
      message: `Removed ${asset.name}`,
      action: {
        label: "Undo",
        onClick: () =>
          setForm((current) => {
            if (current.assets.some((a) => a.id === asset.id)) return current;
            const assets = [...current.assets];
            assets.splice(Math.min(index, assets.length), 0, asset);
            return { ...current, assets };
          }),
      },
    });
  };

  /* ------------------------------------------------------------- delete */

  const activeWork = product
    ? s.commissions.filter(
        (c) => c.businessId === ME.businessId && c.brief.productId === product.id && isActive(c),
      )
    : [];
  const liveRequests = product
    ? s.requests.filter(
        (r) =>
          r.businessId === ME.businessId &&
          r.brief.productId === product.id &&
          (r.status === "open" || r.status === "draft"),
      )
    : [];
  const blocked = activeWork.length > 0 || liveRequests.length > 0;

  const remove = () => {
    if (!live) return;
    const snapshot = live;
    setDeleteOpen(false);
    onDeleted?.();
    actions.deleteProduct(snapshot.id);
    toast({
      message: `Deleted ${snapshot.name}`,
      action: {
        label: "Undo",
        onClick: () => actions.saveProduct(omit(snapshot, ["businessId", "updatedAt"])),
      },
    });
    router.replace("/business/products");
  };

  /* ------------------------------------------------------------ success */

  if (created) {
    return (
      <Page width="narrow">
        <Block tone="paper" pad="lg" className="y-enter flex flex-col items-center gap-6 text-center">
          <Celebrate className="h-36 w-56" />
          <div className="flex max-w-[46ch] flex-col gap-2">
            <h1 className="y-display y-t-display">
              <span className="y-strong">{created.name}</span> is ready to brief
            </h1>
            <p className="y-lead y-fg-2">
              Every request you post for it starts with this context, and what you learn from each
              video is saved back here.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <PillButton href={`/business/requests/new?product=${created.id}`} variant="neon" size="lg" arrow>
              Post a request for it
            </PillButton>
            <PillButton href="/creators" variant="outline" size="lg">
              Find creators
            </PillButton>
          </div>
          <Link href={`/business/products/${created.id}`} className="y-small y-link font-medium">
            Keep editing {created.name}
          </Link>
        </Block>
      </Page>
    );
  }

  /* ------------------------------------------------------------- render */

  const status = dirty
    ? "Unsaved changes"
    : product && live
      ? `Saved ${lowerAgo(live.updatedAt)}`
      : "Not saved yet";
  const usedIn = product ? historyForProduct(s, product.id).length : 0;

  return (
    <Page>
      <div className="px-1 pt-2">
        <GuardedLink
          href={backHref}
          onNavigate={guard}
          className="y-small y-fg-2 -ms-1 inline-flex w-fit items-center gap-1.5 rounded-full py-1 pe-2 font-medium hover:text-(--y-ink)"
        >
          <ArrowLeft size={16} aria-hidden className="y-flip" />
          {returnTo ? "Back to your request" : "Products"}
        </GuardedLink>
      </div>
      <PageHeader
        className="!pt-1"
        eyebrow={product ? "Product profile" : returnTo ? "New product for your request" : "New product"}
        title={product ? (live?.name ?? product.name) : "Add a product"}
        description={
          product
            ? `Saved once, reused in every brief. ${usedIn ? `Used in ${plural(usedIn, "finished commission")}. ` : ""}${live ? `Last updated ${lowerAgo(live.updatedAt)}.` : ""}`
            : returnTo
              ? "Describe it once. After saving, you'll go straight back to your request with it selected."
              : "Tell creators about your app once. Every brief you send starts from this, so nobody has to ask twice."
        }
        actions={
          product ? (
            <GuardedLink
              href={`/business/requests/new?product=${product.id}`}
              onNavigate={guard}
              className="y-pill"
              variant="soft"
            >
              <FilePlus2 size={16} aria-hidden />
              <span>New request for this product</span>
            </GuardedLink>
          ) : null
        }
      />

      <nav aria-label="Sections" className="y-scroll-x -mx-(--y-gutter) mb-3 flex gap-1.5 px-(--y-gutter) lg:hidden">
        {[...jump, ...(product ? [{ id: "history", label: "History" }] : [])].map((item) => (
          <a key={item.id} href={`#${item.id}`} className="y-filter flex-none">
            {item.label}
          </a>
        ))}
      </nav>

      <form
        ref={formRef}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        className="grid items-start gap-2 lg:grid-cols-12"
      >
        <div className="flex min-w-0 flex-col gap-2 lg:col-span-7 xl:col-span-8">
          {/* ------------------------------------------------------ basics */}
          <Section id="basics" title="Basics" description="What it's called and where it runs.">
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Product name"
                name="name"
                required
                maxLength={60}
                autoComplete="off"
                placeholder="e.g. Daftar Invoices"
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                onBlur={() => touch("name")}
                error={errorFor("name")}
              />
              <SelectField
                label="Category"
                name="niche"
                optionalLabel={false}
                value={form.niche}
                onChange={(event) => set("niche", event.target.value as ProductForm["niche"])}
                options={niches.map((n) => ({ value: n.id, label: n.name }))}
                hint="Helps us suggest creators who've made videos for similar apps."
              />
            </div>
            <TextField
              label="One-liner"
              name="oneLiner"
              required
              maxLength={120}
              placeholder="e.g. Make and send an invoice over WhatsApp in about 10 seconds."
              value={form.oneLiner}
              onChange={(event) => set("oneLiner", event.target.value)}
              onBlur={() => touch("oneLiner")}
              error={errorFor("oneLiner")}
              hint={`What it does, in one sentence. It opens every brief. ${form.oneLiner.length}/120`}
            />
            <TextField
              label="Website or app link"
              name="website"
              inputMode="url"
              autoComplete="url"
              placeholder="e.g. daftar.app/invoices"
              value={form.website}
              onChange={(event) => set("website", event.target.value)}
              onBlur={() => touch("website")}
              error={errorFor("website")}
            />

            <fieldset className="flex flex-col gap-2" aria-describedby={`${surfacesId}-hint`}>
              <legend className="y-label mb-2 w-full">
                <span>Where it runs</span>
                <span className="y-micro y-fg-3 font-medium">Optional</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {surfaceOptions.map((option) => {
                  const checked = form.surfaces.includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className={`y-tile flex min-h-14 cursor-pointer items-center gap-3 py-2 ps-3 pe-4 transition-shadow ${
                        checked ? "shadow-[inset_0_0_0_1.5px_var(--b-fg)]" : "hover:shadow-[inset_0_0_0_1.5px_var(--b-line)]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="y-check"
                        checked={checked}
                        onChange={() =>
                          set(
                            "surfaces",
                            checked
                              ? form.surfaces.filter((x) => x !== option.id)
                              : surfaceOptions.map((o) => o.id).filter((x) => x === option.id || form.surfaces.includes(x)),
                          )
                        }
                      />
                      <span className="flex flex-col">
                        <span className="y-small font-semibold">{option.label}</span>
                        <span className="y-micro y-fg-2">{option.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p id={`${surfacesId}-hint`} className="y-micro y-fg-3 px-1">
                Creators film on these, so a web-only product gets a laptop demo instead of a phone.
              </p>
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="y-label mb-2 w-full">
                <span>Brand colour</span>
                <span className="y-micro y-fg-3 font-medium">Used for your product mark</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {[
                  ...brandPalette,
                  ...(brandPalette.some((c) => c.value.toLowerCase() === form.brandColor.toLowerCase())
                    ? []
                    : [{ value: form.brandColor, name: "Current colour" }]),
                ].map((color) => {
                  const checked = color.value.toLowerCase() === form.brandColor.toLowerCase();
                  return (
                    <label key={color.value} className="relative cursor-pointer" title={color.name}>
                      <input
                        type="radio"
                        name={`${colorId}-brand`}
                        value={color.value}
                        checked={checked}
                        onChange={() => set("brandColor", color.value)}
                        className="peer sr-only"
                        aria-label={color.name}
                      />
                      <span
                        aria-hidden
                        className={`grid size-11 place-items-center rounded-full text-white transition-transform peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--b-fg) ${
                          checked ? "scale-105 shadow-[0_0_0_3px_var(--b-bg),0_0_0_5px_var(--b-fg)]" : "hover:scale-105"
                        }`}
                        style={{ background: color.value }}
                      >
                        {checked ? <Check size={18} strokeWidth={3} /> : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </Section>

          {/* ------------------------------------------------------- story */}
          <Section
            id="story"
            title="The story"
            description="The problem and the people. Most good videos open with the problem in the viewer's own words."
          >
            <TextArea
              label="The problem it solves"
              name="problem"
              required
              rows={3}
              maxLength={500}
              placeholder="e.g. They lose money chasing customers who say they'll pay tomorrow."
              value={form.problem}
              onChange={(event) => set("problem", event.target.value)}
              onBlur={() => touch("problem")}
              error={errorFor("problem")}
              hint="Say it the way your users would complain about it."
            />
            <TextArea
              label="Who it's for"
              name="audience"
              required
              rows={3}
              maxLength={500}
              placeholder="e.g. Small shop owners in Saudi Arabia, 25–45, who live on WhatsApp."
              value={form.audience}
              onChange={(event) => set("audience", event.target.value)}
              onBlur={() => touch("audience")}
              error={errorFor("audience")}
              hint="Who, where, roughly what age, and what they care about. Creators use this to pick a dialect and setting."
            />
            <TextArea
              label="What it does"
              name="description"
              rows={3}
              maxLength={800}
              placeholder="A short paragraph a creator could read before filming."
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
            />
            <ListEditor
              label="Features worth showing"
              hint="Most important first. Creators usually demo the top two."
              noun="feature"
              items={form.features}
              onChange={(items) => set("features", items)}
              placeholder="e.g. Send an invoice on WhatsApp in 10 seconds"
              max={8}
            />
          </Section>

          {/* ------------------------------------------------------- voice */}
          <Section id="voice" title="Voice" description="How it should sound, and the lines not to cross.">
            <TonePicker value={form.tone} onChange={(tone) => set("tone", tone)} />
            <div className="grid gap-6 xl:grid-cols-2">
              <ListEditor
                label="Please do"
                noun="do"
                items={form.dos}
                onChange={(items) => set("dos", items)}
                placeholder="e.g. Film at a real shop counter"
                max={8}
              />
              <ListEditor
                label="Please avoid"
                noun="don't"
                items={form.donts}
                onChange={(items) => set("donts", items)}
                placeholder="e.g. Don't say “accounting”"
                max={8}
              />
            </div>
            <TextField
              label="Call to action"
              name="cta"
              maxLength={120}
              placeholder="e.g. Download Daftar and send your first invoice free"
              value={form.cta}
              onChange={(event) => set("cta", event.target.value)}
              hint="The last thing viewers hear."
            />
          </Section>

          {/* ------------------------------------------------------- files */}
          <Section
            id="files"
            title="Files"
            description="Shared with the creator once you hire them, so they never have to ask for screens or a login."
          >
            <AssetsEditor assets={form.assets} onAdd={addAssets} onRemove={removeAsset} />
          </Section>

          {/* --------------------------------------------------- learnings */}
          <Section
            id="learnings"
            title="Learnings"
            description="What you learned from each video. Every new brief for this product includes these, so you never repeat the same feedback."
            aside={<span className="y-chip">{plural(learnings.length, "learning")}</span>}
          >
            <LearningsEditor
              learnings={learnings}
              onAdd={addLearning}
              onRemove={removeLearning}
              live={Boolean(product)}
            />
          </Section>

          {/* ----------------------------------------------------- history */}
          {product ? (
            <Section
              id="history"
              title="History"
              description="Every commission made for this product. Repeat one and its brief, files and learnings come with it."
            >
              <ProductHistory productId={product.id} />
            </Section>
          ) : null}

          {product ? (
            <Block tone="paper" pad="md" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="y-head">Delete this product</h2>
                <p className="y-small y-fg-2">Finished commissions keep their own copy of the brief.</p>
              </div>
              <PillButton
                variant="outline"
                size="sm"
                icon={<Trash2 size={16} aria-hidden />}
                onClick={() => setDeleteOpen(true)}
              >
                Delete product
              </PillButton>
            </Block>
          ) : null}
        </div>

        {/* ------------------------------------------------------ preview */}
        <aside className="min-w-0 lg:sticky lg:top-[88px] lg:col-span-5 xl:col-span-4" aria-label="Preview and save">
          <Block tone="mist" pad="sm" className="flex flex-col gap-3">
            <div className="lg:max-h-[calc(100dvh-236px)] lg:overflow-y-auto lg:[scrollbar-width:thin]">
              <ProductPreview form={form} learnings={learnings} businessName={business.name} />
            </div>
            <div className="hidden flex-col gap-2 border-t border-(--b-line) pt-3 lg:flex">
              <PillButton type="submit" variant="neon" size="lg" arrow className="w-full justify-between">
                {product ? "Save changes" : "Save product"}
              </PillButton>
              <p className="y-micro y-fg-2 text-center" role="status" aria-live="polite">
                {status}
              </p>
            </div>
          </Block>
        </aside>

        {/* -------------------------------------------- mobile save bar */}
        <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] lg:hidden">
          <div
            data-tone="paper"
            className="y-block mx-auto flex max-w-md items-center gap-3 !rounded-full p-2 ps-5 shadow-(--y-shadow-float)"
          >
            <span className="y-small y-fg-2 min-w-0 flex-1 truncate" aria-hidden>
              {status}
            </span>
            <PillButton type="submit" variant="neon" arrow>
              {product ? "Save" : "Save product"}
            </PillButton>
          </div>
        </div>
      </form>

      {/* ------------------------------------------- unsaved changes guard */}
      <Sheet
        open={pending !== null}
        onClose={() => setPending(null)}
        side="center"
        width="sm"
        title="Leave without saving?"
        description={`You changed ${changedSections(form, baseline).join(", ").toLowerCase() || "learnings"} for ${name}.`}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <PillButton
              variant="outline"
              onClick={() => {
                const href = pending;
                setBaseline(form);
                setLocalLearnings([]);
                setPending(null);
                if (href) router.push(href);
              }}
            >
              Discard changes
            </PillButton>
            <PillButton
              variant="contrast"
              data-autofocus
              onClick={() => {
                const href = pending;
                setPending(null);
                if (href) save(href);
              }}
            >
              Save and leave
            </PillButton>
          </div>
        }
      >
        <p className="y-small y-fg-2">
          If you leave now, those changes are lost. Learnings you added to a saved product are already kept.
        </p>
      </Sheet>

      {/* --------------------------------------------------------- delete */}
      {product ? (
        <Sheet
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          side="center"
          width="sm"
          title={blocked ? "This product is still in use" : `Delete ${product.name}?`}
          footer={
            blocked ? (
              <div className="flex justify-end">
                <PillButton variant="contrast" onClick={() => setDeleteOpen(false)}>
                  Got it
                </PillButton>
              </div>
            ) : (
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <PillButton variant="outline" onClick={() => setDeleteOpen(false)}>
                  Keep it
                </PillButton>
                <PillButton variant="contrast" icon={<Trash2 size={16} aria-hidden />} onClick={remove}>
                  Delete product
                </PillButton>
              </div>
            )
          }
        >
          {blocked ? (
            <div className="flex flex-col gap-4">
              <p className="y-small y-fg-2">
                Creators are working from this brief right now. You can delete it once these are
                finished or closed.
              </p>
              <ul className="flex flex-col gap-2">
                {activeWork.map((c) => (
                  <li key={c.id}>
                    <Link href={`/business/commissions/${c.id}`} className="y-tile y-hoverable flex flex-col p-3">
                      <span className="y-small font-semibold">{c.title}</span>
                      <span className="y-micro y-fg-2">Commission in progress</span>
                    </Link>
                  </li>
                ))}
                {liveRequests.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={r.status === "draft" ? `/business/requests/new?draft=${r.id}` : `/business/requests/${r.id}`}
                      className="y-tile y-hoverable flex flex-col p-3"
                    >
                      <span className="y-small font-semibold">{r.title}</span>
                      <span className="y-micro y-fg-2">
                        {r.status === "draft" ? "Draft request" : "Open request"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="y-small y-fg-2">
              This removes its brief context, {plural(live?.assets.length ?? 0, "file")} and{" "}
              {plural(live?.learnings.length ?? 0, "learning")}. Finished commissions keep their own
              copy of the brief.
            </p>
          )}
        </Sheet>
      ) : null}
    </Page>
  );
}

