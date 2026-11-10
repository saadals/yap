"use client";

import { ChevronDown, History, Plus } from "lucide-react";
import { useId, useState } from "react";

import { TextArea, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { plural, shortDate } from "@/lib/format";
import { me } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { Product } from "@/lib/types";

import { ChoiceTile, GroupError, ProductMark } from "./parts";

/**
 * Pick a saved product, or add one inline with the minimum (name, one line, audience). With
 * `learnings`, the chosen product's learnings are listed and can be left out one by one: they are
 * attached to the brief (as must-includes) so nobody repeats a lesson already paid for.
 */
export function ProductPicker({
  products,
  value,
  onSelect,
  learnings,
  error,
  name = "product",
  labelledBy,
  defaultAdding,
}: {
  products: Product[];
  value: string;
  onSelect: (product: Product) => void;
  learnings?: { ids: string[]; onChange: (ids: string[]) => void };
  error?: string | null;
  name?: string;
  labelledBy?: string;
  /** Open the add-a-product form straight away (default: when there are no products yet). */
  defaultAdding?: boolean;
}) {
  const [adding, setAdding] = useState(defaultAdding ?? products.length === 0);
  const errorId = useId();
  const selected = products.find((p) => p.id === value);

  return (
    <div className="flex flex-col gap-2">
      {products.length ? (
        <div
          role="radiogroup"
          aria-labelledby={labelledBy}
          aria-describedby={error ? errorId : undefined}
          data-invalid={error ? "true" : undefined}
          tabIndex={-1}
          className="flex flex-col gap-2 outline-none"
        >
          {products.map((product) => (
            <ChoiceTile
              key={product.id}
              name={name}
              checked={product.id === value}
              onChange={() => onSelect(product)}
              label={`${product.name}. ${product.oneLiner}${
                learnings && product.learnings.length ? ` ${plural(product.learnings.length, "learning")} carried forward.` : ""
              }`}
            >
              <span className="flex items-center gap-3">
                <ProductMark product={product} />
                <span className="flex min-w-0 flex-col">
                  <span className="y-body font-semibold">{product.name}</span>
                  <span className="y-small y-fg-2 line-clamp-1">{product.oneLiner}</span>
                  {learnings ? (
                    <span className="y-micro y-fg-2 mt-0.5 inline-flex items-center gap-1.5">
                      <History size={13} aria-hidden className="flex-none" />
                      {product.learnings.length
                        ? `${plural(product.learnings.length, "learning")} carried forward`
                        : "No learnings yet"}
                    </span>
                  ) : null}
                </span>
              </span>
            </ChoiceTile>
          ))}
        </div>
      ) : null}
      <GroupError id={errorId} message={error} />

      {learnings && selected && selected.learnings.length ? (
        <LearningsPanel product={selected} ids={learnings.ids} onChange={learnings.onChange} />
      ) : null}

      {adding ? (
        <QuickProduct
          first={products.length === 0}
          onCancel={products.length || defaultAdding === false ? () => setAdding(false) : undefined}
          onSaved={(product) => {
            setAdding(false);
            onSelect(product);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="y-dropzone flex min-h-14 items-center gap-3 px-4 text-start"
        >
          <Plus size={18} aria-hidden className="flex-none" />
          <span className="y-small font-semibold">Add a product</span>
          <span className="y-micro y-fg-2 ms-auto hidden sm:inline">Name, one line, who it&apos;s for</span>
        </button>
      )}
    </div>
  );
}

function LearningsPanel({
  product,
  ids,
  onChange,
}: {
  product: Product;
  ids: string[];
  onChange: (ids: string[]) => void;
}) {
  const s = useDemo();
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const attached = product.learnings.filter((l) => ids.includes(l.id)).length;
  return (
    <div className="y-tile flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-12 items-center gap-3 px-4 py-2 text-start"
      >
        <History size={16} aria-hidden className="flex-none" />
        <span className="y-small min-w-0 flex-1">
          <span className="font-semibold">
            {attached === product.learnings.length
              ? `${plural(attached, "learning")} attached`
              : `${attached} of ${plural(product.learnings.length, "learning")} attached`}
          </span>
          <span className="y-fg-2"> · from past work on {product.name}</span>
        </span>
        <ChevronDown size={16} aria-hidden className={`flex-none transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <ul id={bodyId} className="flex flex-col gap-1 px-2 pb-3">
          {product.learnings.map((learning) => {
            const by = learning.creatorId ? s.creators.find((c) => c.id === learning.creatorId) : undefined;
            const on = ids.includes(learning.id);
            return (
              <li key={learning.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-(--y-r-sm) p-2 hover:bg-(--b-bg)">
                  <input
                    type="checkbox"
                    className="y-check mt-0.5"
                    checked={on}
                    onChange={() => onChange(on ? ids.filter((x) => x !== learning.id) : [...ids, learning.id])}
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="y-small">{learning.text}</span>
                    <span className="y-micro y-fg-2">
                      {by ? `From working with ${by.firstName}` : "Saved by your team"} · {shortDate(learning.createdAt)}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
          <li className="y-micro y-fg-2 px-2 pt-1">Attached learnings go into the brief&apos;s must-include list.</li>
        </ul>
      ) : null}
    </div>
  );
}

/** The minimum product: saved straight away, so it's reused in every order after this one. */
function QuickProduct({
  first,
  onCancel,
  onSaved,
}: {
  first: boolean;
  onCancel?: () => void;
  onSaved: (product: Product) => void;
}) {
  const s = useDemo();
  const [name, setName] = useState("");
  const [line, setLine] = useState("");
  const [audience, setAudience] = useState("");
  const [tried, setTried] = useState(false);
  const errors = {
    name: name.trim().length < 2 ? "Give it a name." : null,
    line: line.trim().length < 8 ? "Add one line about what it does (at least 8 characters)." : null,
    audience: audience.trim().length < 10 ? "Say who it's for in a few words (at least 10 characters)." : null,
  };
  const valid = !errors.name && !errors.line && !errors.audience;
  const save = () => {
    if (!valid) {
      setTried(true);
      return;
    }
    const business = me.business(s);
    const fields = {
      name: name.trim(),
      oneLiner: line.trim(),
      description: line.trim(),
      website: business.website,
      niche: business.industry,
      surfaces: [] as Product["surfaces"],
      audience: audience.trim(),
      problem: "",
      features: [],
      tone: [],
      dos: [],
      donts: [],
      cta: "",
      brandColor: business.brandColor,
    };
    const id = actions.saveProduct(fields);
    onSaved({ ...fields, id, businessId: business.id, assets: [], learnings: [], updatedAt: "" });
  };
  return (
    <div className="y-tile flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-0.5">
        <p className="y-small font-semibold">{first ? "Add your product" : "Add a product"}</p>
        <p className="y-micro y-fg-2">
          Saved to your products, so the next order starts from it. Tone, files and dos and don&apos;ts can wait.
        </p>
      </div>
      <TextField
        label="Product name"
        required
        placeholder="e.g. Daftar Invoices"
        value={name}
        error={tried ? errors.name : null}
        onChange={(event) => setName(event.target.value)}
      />
      <TextField
        label="What it does, in one line"
        required
        placeholder="e.g. Send an invoice on WhatsApp in 10 seconds"
        value={line}
        error={tried ? errors.line : null}
        onChange={(event) => setLine(event.target.value)}
      />
      <TextArea
        label="Who it's for"
        required
        rows={2}
        placeholder="e.g. Shop owners in Canada and the US who run the business from their phone"
        value={audience}
        error={tried ? errors.audience : null}
        onChange={(event) => setAudience(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <PillButton variant="contrast" onClick={save}>
          Save product
        </PillButton>
        {onCancel ? (
          <PillButton variant="ghost" onClick={onCancel}>
            Cancel
          </PillButton>
        ) : null}
      </div>
    </div>
  );
}
