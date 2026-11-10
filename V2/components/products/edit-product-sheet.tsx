"use client";

import { useRef, useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { actions } from "@/lib/store";
import type { Product } from "@/lib/types";

import { BasicsFields, FilesFields, StoryFields, VoiceFields, changedSections, useProductForm } from "./product-fields";
import { fieldOrder, formFromProduct, toSaveInput } from "./product-form";

function Group({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 border-t border-(--b-line) pt-6 first:border-0 first:pt-0">
      <h3 id={id} className="y-head">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Edit a saved product's brief context in a sheet: basics, story, voice and files, saved together.
 * Closing with unsaved changes asks first (inline, in the footer). Learnings are edited on the page
 * (they apply right away).
 */
export function EditProductSheet({ product, open, onClose }: { product: Product; open: boolean; onClose: () => void }) {
  return open ? <Editor key={product.id} product={product} onClose={onClose} /> : null;
}

function Editor({ product, onClose }: { product: Product; onClose: () => void }) {
  const toast = useToast();
  const state = useProductForm(formFromProduct(product));
  const [confirming, setConfirming] = useState(false);
  const bodyRef = useRef<HTMLFormElement>(null);

  const requestClose = () => {
    if (state.dirty) setConfirming(true);
    else onClose();
  };

  const save = () => {
    const first = fieldOrder.find((field) => state.errors[field]);
    if (first) {
      state.reveal(["name", "oneLiner", "audience", "problem", "website"]);
      bodyRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    actions.saveProduct(toSaveInput(state.form, { id: product.id }));
    toast({ message: `Saved. New briefs for ${state.form.name.trim()} use this from now on.` });
    onClose();
  };

  return (
    <Sheet
      open
      onClose={requestClose}
      title={`Edit ${product.name}`}
      description="What creators get in every brief for this product."
      width="lg"
      footer={
        confirming ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" role="alertdialog" aria-label="Discard changes?">
            <p className="y-small">
              <span className="font-semibold">Discard your changes?</span>{" "}
              <span className="y-fg-2">You changed {changedSections(state.form, state.baseline).join(", ")}.</span>
            </p>
            <div className="flex flex-none gap-2">
              <PillButton variant="outline" onClick={onClose}>
                Discard
              </PillButton>
              <PillButton variant="contrast" data-autofocus onClick={() => setConfirming(false)}>
                Keep editing
              </PillButton>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <PillButton type="submit" form="edit-product-form" variant="neon" disabled={!state.dirty}>
              Save changes
            </PillButton>
            <PillButton variant="ghost" onClick={requestClose}>
              Cancel
            </PillButton>
            <span className="y-small y-fg-2 ms-auto hidden sm:inline" role="status" aria-live="polite">
              {state.dirty ? "Unsaved changes" : "No changes yet"}
            </span>
          </div>
        )
      }
    >
      <form
        id="edit-product-form"
        ref={bodyRef}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        className="flex flex-col gap-6 pt-2"
      >
        <Group id="edit-basics" title="Basics">
          <BasicsFields state={state} />
        </Group>
        <Group id="edit-story" title="The story">
          <StoryFields state={state} />
        </Group>
        <Group id="edit-voice" title="Voice">
          <VoiceFields state={state} />
        </Group>
        <Group id="edit-files" title="Files">
          <FilesFields state={state} />
        </Group>
      </form>
    </Sheet>
  );
}
