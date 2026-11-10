import { Check, Link2, Minus, Sparkles, Video as VideoIcon, VideoOff } from "lucide-react";

import { MatchScore } from "@/components/ui/match-score";
import { lengthLabel, plural, quoted } from "@/lib/format";
import { isAdCopy } from "@/lib/selectors";
import type { Fit } from "@/lib/selectors";
import { addonById, aspects, formatById, languageById, platformById, usageById } from "@/lib/taxonomy";
import type { Brief, Product } from "@/lib/types";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-(--b-line) py-3">
      <dt className="y-micro y-fg-2">{label}</dt>
      <dd className="y-small font-semibold">{children}</dd>
    </div>
  );
}

function Prose({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="y-micro y-fg-2">{label}</h3>
      <div className="y-body max-w-[62ch]">{children}</div>
    </div>
  );
}

/**
 * Read-only brief: deliverables first (the facts creators price on), then the creative
 * direction, then guardrails. Put it inside a paper Block.
 */
export function BriefSummary({
  brief,
  product,
  showProduct = true,
}: {
  brief: Brief;
  product?: Product;
  showProduct?: boolean;
}) {
  const format = formatById[brief.format];
  const FormatIcon = format.icon;
  const adCopy = isAdCopy({ brief });
  return (
    <div className="flex flex-col gap-6">
      {showProduct && product ? (
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="y-display grid size-11 flex-none place-items-center rounded-(--y-r-field) text-lg font-semibold text-white"
            style={{ background: product.brandColor }}
          >
            {product.name.slice(0, 1)}
          </span>
          <div>
            <p className="y-head">{product.name}</p>
            <p className="y-small y-fg-2">{product.oneLiner}</p>
          </div>
        </div>
      ) : null}

      {adCopy ? (
        // Ad copy: no format, length, aspect, platform or camera to show.
        <dl className="grid grid-cols-2 gap-x-6 md:grid-cols-3">
          <Fact label="Job type">
            <span className="inline-flex items-center gap-1.5">
              <FormatIcon size={16} aria-hidden /> {format.name}
            </span>
          </Fact>
          {brief.copy?.pieces.length ? <Fact label="What to write">{brief.copy.pieces.join(" · ")}</Fact> : null}
          {brief.copy?.placements.length ? (
            <Fact label="Where it runs">{brief.copy.placements.map((id) => platformById[id].name).join(", ")}</Fact>
          ) : null}
          <Fact label="Language">{brief.languages.map((id) => languageById[id].name).join(", ")}</Fact>
          <Fact label="Usage">
            {usageById[brief.usage].name}
            <span className="y-micro y-fg-2 block font-normal">Part of the price</span>
          </Fact>
        </dl>
      ) : (
      <dl className="grid grid-cols-2 gap-x-6 md:grid-cols-3">
        <Fact label="Format">
          <span className="inline-flex items-center gap-1.5">
            <FormatIcon size={16} aria-hidden /> {format.name}
          </span>
        </Fact>
        <Fact label="Deliverables">
          {plural(brief.videoCount, "video")} · up to {lengthLabel(brief.durationSec)}
        </Fact>
        <Fact label="Aspect ratio">{aspects.find((a) => a.id === brief.aspect)?.name ?? brief.aspect}</Fact>
        <Fact label="Language">
          {brief.languages.map((id) => languageById[id].name).join(", ")}
        </Fact>
        <Fact label="Platforms">{brief.platforms.map((id) => platformById[id].name).join(", ")}</Fact>
        <Fact label="On camera">
          <span className="inline-flex items-center gap-1.5">
            {brief.onCamera ? <VideoIcon size={16} aria-hidden /> : <VideoOff size={16} aria-hidden />}
            {brief.onCamera ? "Creator on camera" : "Voiceover only"}
          </span>
        </Fact>
        <Fact label="Usage">
          {usageById[brief.usage].name}
          <span className="y-micro y-fg-2 block font-normal">Part of the price · raw footage included</span>
        </Fact>
      </dl>
      )}

      <div className="flex flex-col gap-5">
        {brief.audience.trim() ? <Prose label="Who it's for">{brief.audience}</Prose> : null}
        {brief.goal.trim() ? <Prose label="Goal">{brief.goal}</Prose> : null}
        {brief.keyMessage.trim() ? (
          <Prose label="Key message">
            <p className="y-display text-[20px] leading-snug">{quoted(brief.keyMessage)}</p>
          </Prose>
        ) : null}
      </div>

      {brief.mustInclude.length || brief.avoid.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {brief.mustInclude.length ? (
            <div className="flex flex-col gap-2">
              <h3 className="y-micro y-fg-2">Must include</h3>
              <ul className="flex flex-col gap-2">
                {brief.mustInclude.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid size-5 flex-none place-items-center rounded-full bg-(--b-fg) text-(--b-bg)">
                      <Check size={12} strokeWidth={3} aria-hidden />
                    </span>
                    <span className="y-small">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {brief.avoid.length ? (
            <div className="flex flex-col gap-2">
              <h3 className="y-micro y-fg-2">Please avoid</h3>
              <ul className="flex flex-col gap-2">
                {brief.avoid.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid size-5 flex-none place-items-center rounded-full bg-(--b-chip) shadow-[inset_0_0_0_1.5px_var(--b-line)]">
                      <Minus size={12} strokeWidth={3} aria-hidden />
                    </span>
                    <span className="y-small">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {brief.references.length || brief.addons.length || brief.notes ? (
        <details className="group border-t border-(--b-line) pt-3">
          <summary className="y-small flex cursor-pointer list-none items-center justify-between gap-2 py-1 font-semibold [&::-webkit-details-marker]:hidden">
            More details
            <span className="y-micro y-fg-2 font-normal group-open:hidden">
              {[
                brief.references.length ? plural(brief.references.length, "reference") : null,
                brief.addons.length ? plural(brief.addons.length, "add-on") : null,
                brief.notes ? "notes" : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </summary>
          <div className="flex flex-col gap-5 pt-3">
            {brief.references.length ? (
              <div className="flex flex-col gap-2">
                <h3 className="y-micro y-fg-2">References</h3>
                <ul className="flex flex-col gap-1.5">
                  {brief.references.map((ref) => (
                    <li key={ref.id} className="y-small flex items-start gap-2">
                      <Link2 size={15} aria-hidden className="mt-0.5 flex-none" />
                      <span>
                        <span className="font-semibold">{ref.label}</span>
                        {ref.note ? <span className="y-fg-2"> — {ref.note}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {brief.addons.length ? (
              <div className="flex flex-col gap-2">
                <h3 className="y-micro y-fg-2">Add-ons requested</h3>
                <div className="flex flex-wrap gap-1.5">
                  {brief.addons.map((id) => {
                    const addon = addonById[id];
                    const Icon = addon.icon;
                    return (
                      <span key={id} className="y-chip">
                        <Icon size={14} aria-hidden /> {addon.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {brief.notes ? <Prose label="Notes">{brief.notes}</Prose> : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}

/** Explained fit. Never a black box: reasons and gaps are listed. */
export function FitPanel({ fit, title = "Your fit" }: { fit: Fit; title?: string }) {
  return (
    <div data-tone="paper" className="y-block y-pad-md flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <h2 className="y-head flex items-center gap-2">
          <Sparkles size={18} aria-hidden className="flex-none" />
          {title}
        </h2>
        <MatchScore value={fit.score} label="fit" />
      </div>
      <ul className="flex flex-col gap-2">
        {fit.reasons.map((reason) => (
          <li key={reason} className="flex items-start gap-3">
            <span className="mt-0.5 grid size-6 flex-none place-items-center rounded-full bg-(--b-fg) text-(--b-bg)">
              <Check size={14} strokeWidth={3} aria-hidden />
            </span>
            <span className="y-small">{reason}</span>
          </li>
        ))}
        {fit.gaps.map((gap) => (
          <li key={gap} className="flex items-start gap-3">
            <span className="mt-0.5 grid size-6 flex-none place-items-center rounded-full bg-(--b-chip) shadow-[inset_0_0_0_1.5px_var(--b-line)]">
              <Minus size={14} strokeWidth={3} aria-hidden />
            </span>
            <span className="y-small">
              <span className="sr-only">Gap: </span>
              {gap}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
