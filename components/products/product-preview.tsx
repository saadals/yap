import { Check, Eye, Lightbulb, Lock, Minus, Paperclip } from "lucide-react";

import { plural } from "@/lib/format";
import { nicheById } from "@/lib/taxonomy";
import type { Learning } from "@/lib/types";

import { type ProductForm, surfaceLabel } from "./product-form";
import { ProductMark } from "./product-mark";

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="y-micro y-fg-2">{label}</h3>
      {children}
    </div>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return <p className="y-small y-fg-3">{children}</p>;
}

/**
 * How creators see this product's context inside a brief. Updates live as the form changes.
 * Lives in a mist block; the brief itself is a paper card.
 */
export function ProductPreview({
  form,
  learnings,
  businessName,
}: {
  form: ProductForm;
  learnings: Learning[];
  businessName: string;
}) {
  const features = form.features.map((f) => f.trim()).filter(Boolean);
  const dos = form.dos.map((f) => f.trim()).filter(Boolean);
  const donts = form.donts.map((f) => f.trim()).filter(Boolean);
  const name = form.name.trim() || "Your product";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2 px-1">
        <Eye size={18} aria-hidden className="mt-0.5 flex-none" />
        <div>
          <h2 className="y-head">Live preview</h2>
          <p className="y-micro y-fg-2">How creators see {name} in every brief you send.</p>
        </div>
      </div>

      <div data-tone="paper" className="y-block flex flex-col gap-5 !rounded-(--y-r-tile) p-5">
        <div className="flex items-start gap-3">
          <ProductMark product={{ name, brandColor: form.brandColor }} size={44} />
          <div className="min-w-0 flex-1">
            <p className="y-micro y-fg-2">{businessName}</p>
            <p className="y-head break-words">{name}</p>
            {form.oneLiner.trim() ? (
              <p className="y-small y-fg-2 break-words">{form.oneLiner}</p>
            ) : (
              <Placeholder>Your one-liner appears here.</Placeholder>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="y-chip">{nicheById[form.niche].name}</span>
          {form.surfaces.map((surface) => (
            <span key={surface} className="y-chip">
              {surfaceLabel[surface]}
            </span>
          ))}
        </div>

        <Section label="The problem">
          {form.problem.trim() ? (
            <p className="y-small break-words">{form.problem}</p>
          ) : (
            <Placeholder>What goes wrong for your users without you.</Placeholder>
          )}
        </Section>

        <Section label="Who it's for">
          {form.audience.trim() ? (
            <p className="y-small break-words">{form.audience}</p>
          ) : (
            <Placeholder>The people the video talks to.</Placeholder>
          )}
        </Section>

        {features.length ? (
          <Section label="Worth showing">
            <ol className="flex flex-col gap-1.5">
              {features.slice(0, 5).map((feature, index) => (
                <li key={`${index}-${feature}`} className="y-small flex gap-2">
                  <span className="y-num y-fg-3 w-4 flex-none text-end">{index + 1}</span>
                  <span className="break-words">{feature}</span>
                </li>
              ))}
            </ol>
            {features.length > 5 ? (
              <p className="y-micro y-fg-3">+{features.length - 5} more</p>
            ) : null}
          </Section>
        ) : null}

        {form.tone.length ? (
          <Section label="Tone">
            <div className="flex flex-wrap gap-1.5">
              {form.tone.map((tone) => (
                <span key={tone} className="y-chip">
                  {tone}
                </span>
              ))}
            </div>
          </Section>
        ) : null}

        {dos.length || donts.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {dos.length ? (
              <Section label="Please do">
                <ul className="flex flex-col gap-1.5">
                  {dos.map((item, index) => (
                    <li key={`${index}-${item}`} className="flex items-start gap-2">
                      <span className="mt-0.5 grid size-5 flex-none place-items-center rounded-full bg-(--b-fg) text-(--b-bg)">
                        <Check size={12} strokeWidth={3} aria-hidden />
                      </span>
                      <span className="y-small break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}
            {donts.length ? (
              <Section label="Please avoid">
                <ul className="flex flex-col gap-1.5">
                  {donts.map((item, index) => (
                    <li key={`${index}-${item}`} className="flex items-start gap-2">
                      <span className="mt-0.5 grid size-5 flex-none place-items-center rounded-full bg-(--b-chip) shadow-[inset_0_0_0_1.5px_var(--b-line)]">
                        <Minus size={12} strokeWidth={3} aria-hidden />
                      </span>
                      <span className="y-small break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}
          </div>
        ) : null}

        {form.cta.trim() ? (
          <Section label="End with">
            <p className="y-display text-[19px] leading-snug break-words">&ldquo;{form.cta.trim()}&rdquo;</p>
          </Section>
        ) : null}

        {learnings.length ? (
          <div className="y-tile flex flex-col gap-2 p-4">
            <h3 className="y-small flex items-center gap-1.5 font-semibold">
              <Lightbulb size={16} aria-hidden /> Learned from past videos
            </h3>
            <ul className="flex flex-col gap-1.5">
              {learnings.slice(0, 3).map((learning) => (
                <li key={learning.id} className="y-small y-clamp-2">
                  {learning.text}
                </li>
              ))}
            </ul>
            {learnings.length > 3 ? (
              <p className="y-micro y-fg-2">+{learnings.length - 3} more in the full brief</p>
            ) : null}
          </div>
        ) : null}

        <p className="y-micro y-fg-2 flex items-center gap-1.5 border-t border-(--b-line) pt-3">
          {form.assets.length ? (
            <>
              <Paperclip size={14} aria-hidden /> {plural(form.assets.length, "file")} shared with the
              creator you hire
            </>
          ) : (
            <>
              <Lock size={14} aria-hidden /> No files yet. Add screens or a demo login below.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
