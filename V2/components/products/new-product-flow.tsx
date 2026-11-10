"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Block } from "@/components/ui/block";
import { Celebrate } from "@/components/ui/celebrate";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { NOW_ISO } from "@/lib/clock";
import { paths } from "@/lib/paths";
import { me } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { Learning } from "@/lib/types";

import { Learnings } from "./learnings";
import { BasicsFields, FilesFields, StoryFields, VoiceFields, changedSections, useProductForm } from "./product-fields";
import { type FieldErrors, emptyForm, toSaveInput } from "./product-form";
import { ProductPreview } from "./product-preview";

/** Only same-site paths are allowed as a return target (`?return=` from an order flow). */
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

type StepId = "basics" | "story" | "voice" | "extras";
const STEPS: { id: StepId; title: string; lead: string; required: (keyof FieldErrors)[] }[] = [
  {
    id: "basics",
    title: "What are you promoting?",
    lead: "Its name and what it does in one line. Every brief opens with this.",
    required: ["name", "oneLiner", "website"],
  },
  {
    id: "story",
    title: "Who is it for, and what problem does it solve?",
    lead: "Most videos open with the problem, told the way your users would say it.",
    required: ["problem", "audience"],
  },
  {
    id: "voice",
    title: "How should it sound?",
    lead: "Tone, dos and don'ts, and the last thing viewers hear. All optional.",
    required: [],
  },
  {
    id: "extras",
    title: "Anything creators should have?",
    lead: "Optional. Screens or a demo login let creators film real screens; learnings go into every brief.",
    required: [],
  },
];

/**
 * /products/new: the product editor as a focused flow, one question per step, a sticky bar with
 * Back and Continue, and a live "how creators see it" preview on desktop. Learnings added here are
 * saved with the product. With `returnTo` (an order flow), saving goes straight back to it with the
 * new product selected.
 */
export function NewProductFlow({ returnTo }: { returnTo: string | null }) {
  const s = useDemo();
  const router = useRouter();
  const toast = useToast();
  const business = me.business(s);
  const state = useProductForm(emptyForm(business.industry));
  const [step, setStep] = useState(0);
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const localId = useRef(0);
  const dirty = state.dirty || learnings.length > 0;
  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  const backHref = returnTo ?? paths.products;

  useEffect(() => {
    if (!dirty || created) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, created]);

  const go = (next: number) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  };

  /** Errors on this step's required fields: shows them and focuses the first. */
  const blocked = () => {
    const missing = current.required.filter((field) => state.errors[field]);
    if (!missing.length) return false;
    state.reveal(missing);
    window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[name="${missing[0]}"]`)?.focus());
    return true;
  };

  const save = () => {
    // Every step's required fields, in case one was skipped.
    const all = STEPS.flatMap((st) => st.required);
    const firstBad = STEPS.findIndex((st) => st.required.some((field) => state.errors[field]));
    if (firstBad >= 0) {
      state.reveal(all);
      go(firstBad);
      return;
    }
    const name = state.form.name.trim();
    const id = actions.saveProduct(toSaveInput(state.form, { learnings }));
    state.commit();
    setLearnings([]);
    if (returnTo) {
      toast({ message: `${name} saved. It's selected in your order.` });
      router.push(withProduct(returnTo, id));
      return;
    }
    toast({ message: `${name} saved` });
    setCreated({ id, name });
    window.scrollTo({ top: 0 });
  };

  const next = () => {
    if (blocked()) return;
    if (last) save();
    else go(step + 1);
  };

  const leave = (href: string) => (event: React.MouseEvent) => {
    if (!dirty) return;
    event.preventDefault();
    setLeaving(href);
  };

  if (created) {
    return (
      <Page width="narrow">
        <Block tone="paper" pad="lg" className="y-enter mt-4 flex flex-col items-center gap-5 text-center">
          <Celebrate className="h-32 w-52" />
          <div className="flex max-w-[46ch] flex-col gap-2">
            <h1 className="y-display y-t-display">{created.name} is ready to brief</h1>
            <p className="y-body y-fg-2">
              Every order you place for it starts from this context, and what you learn from each video is
              saved back to it.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <PillButton href={paths.newOrder({ product: created.id })} variant="neon" arrow>
              Order a video for it
            </PillButton>
            <PillButton href={paths.product(created.id)} variant="soft">
              See the product
            </PillButton>
          </div>
        </Block>
      </Page>
    );
  }

  return (
    <Page>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <form
          ref={formRef}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            next();
          }}
          className="flex min-w-0 flex-col gap-6 lg:col-span-7"
        >
          <div className="flex flex-col gap-3">
            <Link
              href={backHref}
              onClick={leave(backHref)}
              className="y-small y-fg-2 -ms-1 inline-flex w-fit items-center gap-1.5 rounded-full py-1 pe-2 font-medium hover:text-(--y-ink)"
            >
              <ArrowLeft size={16} aria-hidden className="y-flip" />
              {returnTo ? "Back to your order" : "Products"}
            </Link>
            <div className="flex items-center gap-3" aria-hidden>
              {STEPS.map((st, index) => (
                <span
                  key={st.id}
                  className={`h-1 flex-1 rounded-full ${index <= step ? "bg-(--y-ink)" : "bg-(--y-mist)"}`}
                />
              ))}
            </div>
            <p className="y-eyebrow">
              New product · Step {step + 1} of {STEPS.length}
            </p>
            <h1 ref={headingRef} tabIndex={-1} className="y-display y-t-display outline-none">
              {current.title}
            </h1>
            <p className="y-body y-fg-2 max-w-[60ch]">{current.lead}</p>
          </div>

          <Block key={current.id} tone="paper" pad="md" className="y-enter flex flex-col gap-6">
            {current.id === "basics" ? <BasicsFields state={state} /> : null}
            {current.id === "story" ? <StoryFields state={state} /> : null}
            {current.id === "voice" ? <VoiceFields state={state} /> : null}
            {current.id === "extras" ? (
              <>
                <section aria-labelledby="files-step" className="flex flex-col gap-3">
                  <h2 id="files-step" className="y-head">
                    Files
                  </h2>
                  <FilesFields state={state} />
                </section>
                <section aria-labelledby="learnings-step" className="flex flex-col gap-3 border-t border-(--b-line) pt-6">
                  <h2 id="learnings-step" className="y-head">
                    Learnings
                  </h2>
                  <Learnings
                    live={false}
                    learnings={learnings}
                    onAdd={(text) => {
                      localId.current += 1;
                      const id = `l-local-${localId.current}`;
                      setLearnings((list) => [{ id, text, createdAt: NOW_ISO }, ...list]);
                    }}
                    onRemove={(learning) => setLearnings((list) => list.filter((l) => l.id !== learning.id))}
                  />
                </section>
              </>
            ) : null}
          </Block>

          {/* Sticky action bar (glass), every screen size. */}
          <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] lg:px-(--y-gutter) lg:pb-5">
            <div className="y-bar mx-auto flex max-w-md items-center gap-2 rounded-full p-2 ps-3 lg:max-w-[calc(1200px)]">
              {step > 0 ? (
                <PillButton variant="ghost" onClick={() => go(step - 1)}>
                  Back
                </PillButton>
              ) : (
                <PillButton
                  variant="ghost"
                  onClick={() => (dirty ? setLeaving(backHref) : router.push(backHref))}
                >
                  Cancel
                </PillButton>
              )}
              <span className="y-small y-fg-2 min-w-0 flex-1 truncate text-center" role="status" aria-live="polite">
                {dirty ? "Not saved yet" : ""}
              </span>
              <PillButton type="submit" variant="neon" arrow>
                {last ? "Save product" : "Continue"}
              </PillButton>
            </div>
          </div>
        </form>

        <aside aria-label="Preview" className="hidden min-w-0 lg:col-span-4 lg:col-start-9 lg:block">
          <div className="y-rail pt-[44px]">
            <Block tone="mist" pad="sm">
              <ProductPreview form={state.form} learnings={learnings} businessName={business.name} />
            </Block>
          </div>
        </aside>
      </div>

      <Sheet
        open={leaving !== null}
        onClose={() => setLeaving(null)}
        side="center"
        width="sm"
        title="Leave without saving?"
        description={`You've filled in ${changedSections(state.form, state.baseline).join(", ") || "learnings"} for ${state.form.name.trim() || "this product"}.`}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <PillButton
              variant="outline"
              onClick={() => {
                const href = leaving;
                state.revert();
                setLearnings([]);
                setLeaving(null);
                if (href) router.push(href);
              }}
            >
              Discard and leave
            </PillButton>
            <PillButton variant="contrast" data-autofocus onClick={() => setLeaving(null)}>
              Keep going
            </PillButton>
          </div>
        }
      >
        <p className="y-small y-fg-2">Nothing is saved until the last step. If you leave now, it&apos;s lost.</p>
      </Sheet>
    </Page>
  );
}
