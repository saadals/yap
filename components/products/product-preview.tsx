import { Eye } from "lucide-react";

import { plural } from "@/lib/format";
import type { Learning } from "@/lib/types";

import type { ProductForm } from "./product-form";
import { ProductMark } from "./product-mark";

function Part({ label, text, empty }: { label: string; text: string; empty: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="y-micro y-fg-2">{label}</h3>
      {text.trim() ? (
        <p className="y-small line-clamp-3 break-words">{text}</p>
      ) : (
        <p className="y-small y-fg-3">{empty}</p>
      )}
    </div>
  );
}

/**
 * Compact view of how creators see this product at the top of a brief: who, the problem, the
 * audience, and one line for everything else that travels with it. Updates live as you type.
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
  const name = form.name.trim() || "Your product";
  const count = (list: string[]) => list.filter((item) => item.trim()).length;
  const features = count(form.features);
  const rules = count(form.dos) + count(form.donts);
  const carried = [
    features ? plural(features, "feature") : "",
    rules ? plural(rules, "do and don't", "dos and don'ts") : "",
    learnings.length ? plural(learnings.length, "learning") : "",
    form.assets.length ? plural(form.assets.length, "file") : "",
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="y-small flex items-center gap-2 px-1 font-semibold">
        <Eye size={16} aria-hidden /> How creators see it
      </h2>

      <div data-tone="paper" className="y-block flex flex-col gap-4 !rounded-(--y-r-tile) p-5">
        <div className="flex items-start gap-3">
          <ProductMark product={{ name, brandColor: form.brandColor }} size={40} />
          <div className="min-w-0 flex-1">
            <p className="y-micro y-fg-2">{businessName}</p>
            <p className="y-head break-words">{name}</p>
            {form.oneLiner.trim() ? (
              <p className="y-small y-fg-2 break-words">{form.oneLiner}</p>
            ) : (
              <p className="y-small y-fg-3">Your one-liner appears here.</p>
            )}
          </div>
        </div>

        <Part label="The problem" text={form.problem} empty="What goes wrong for your users without you." />
        <Part label="Who it's for" text={form.audience} empty="The people the video talks to." />

        <p className="y-micro y-fg-2 border-t border-(--b-line) pt-3">
          {carried.length ? `Also in every brief: ${carried.join(" · ")}` : "Features, dos and don'ts and learnings show up here too."}
        </p>
      </div>
    </div>
  );
}
