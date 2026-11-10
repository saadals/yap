"use client";

import { AlertCircle } from "lucide-react";

import { languageList } from "@/components/domain/chips";
import { PaymentMethodPicker } from "@/components/domain/money";
import { DefinitionList } from "@/components/ui/data";
import { money, moneyRange, plural } from "@/lib/format";
import {
  AUTO_APPROVE_DAYS,
  campaignPlatformById,
  formatById,
  nicheById,
  platformById,
  tierById,
  usageById,
} from "@/lib/taxonomy";

import {
  STEP_LABELS,
  TITLE_MAX,
  errorId,
  fieldId,
  kindName,
  linesOf,
  postedBudget,
} from "./model";
import { controlProps, FieldError, Fld, StepCard } from "./parts";
import type { StepProps } from "./step-props";

const lines = (items: string[]) =>
  items.length ? (
    <span className="y-nw-lines">
      {items.map((item, index) => (
        <span key={index}>{item}</span>
      ))}
    </span>
  ) : (
    "—"
  );

/** Step 6: everything once more, the confirmation with the money sentence, and Post. */
export function PostStep({ s, form, d, set, err, goTo, headingRef }: StepProps) {
  const campaign = form.kind === "campaign";
  const titleErr = err("title");
  const agreeErr = err("agree");
  const payErr = err("payment");
  const budget = postedBudget(form, d);
  const invited = form.invitedCreatorIds
    .map((id) => s.creators.find((c) => c.id === id)?.firstName)
    .filter(Boolean)
    .join(", ");

  const items: { term: string; detail: React.ReactNode; wide?: boolean }[] = [
    { term: "Type", detail: form.kind ? kindName(form.kind) : "—" },
    { term: "Product", detail: d.productName || "—" },
    { term: "Category", detail: form.category ? nicheById[form.category].name : "—" },
    {
      term: "Job type",
      detail: d.adCopy ? "Ad copy writing" : `Full video${form.format ? ` · ${formatById[form.format].name}` : ""}`,
    },
  ];
  if (campaign) {
    items.push({
      term: "Platforms",
      detail: lines(
        form.campaignPlatforms.map(
          (p) => `${campaignPlatformById[p].name}${d.handles[p] ? ` · @${d.handles[p]}` : ""}`,
        ),
      ),
    });
  } else if (d.adCopy) {
    items.push({ term: "Where it runs", detail: form.copyPlacements.map((p) => platformById[p].name).join(", ") || "—" });
  } else {
    items.push({ term: "Platforms", detail: form.platforms.map((p) => platformById[p].name).join(", ") || "—" });
  }
  items.push({ term: "Deadline", detail: `${plural(form.deadlineDays, "day")} · set by you` });
  if (campaign) {
    items.push({ term: "Follower tier", detail: `${tierById[form.tierId].label} verified followers` });
    items.push({
      term: "Yapps",
      detail: (
        <>
          <span className="y-num">
            {form.videos} × {money(d.price)}
          </span>
          {d.belowRange ? (
            <span className="y-nw-dl-warn">
              Below the usual {money(d.guidance.low)}–{money(d.guidance.high)}. Fewer creators may pick it.{" "}
              <button type="button" className="y-nw-link" onClick={() => set({ price: d.guidance.low })}>
                Use {money(d.guidance.low)}
              </button>
            </span>
          ) : null}
        </>
      ),
    });
  } else {
    items.push({
      term: "Budget",
      detail: (
        <span className="y-num">
          {moneyRange(budget.min, budget.max)}
          {!d.adCopy ? ` · ${plural(form.videoCount, form.format === "hook-pack" ? "hook" : "video")}` : ""}
        </span>
      ),
    });
    items.push({
      term: "Who can pitch",
      detail:
        form.visibility === "invite"
          ? `Invited creators only${invited ? ` · ${invited}` : ""}`
          : `Everyone who fits${invited ? ` · ${invited} invited` : ""}`,
    });
  }
  items.push({ term: "Usage", detail: usageById[form.usage].name });
  items.push({ term: "Language", detail: languageList(form.languages) || "—" });
  if (d.adCopy) items.push({ term: "What to write", detail: lines(linesOf(form.copyPieces)), wide: true });
  items.push({ term: "Attachments", detail: form.attachments.length ? plural(form.attachments.length, "file") : "None" });
  items.push({ term: d.adCopy ? "Opening line" : "Hook", detail: form.hook.trim() || "—" });
  items.push({ term: d.adCopy ? "Must get across" : "Must show", detail: lines(linesOf(form.mustShow)), wide: true });
  if (form.dontSay.trim()) items.push({ term: "Don't say", detail: lines(linesOf(form.dontSay)), wide: true });

  const goesTo =
    !campaign && form.visibility === "invite"
      ? "It goes to the creators you invited right away."
      : "It goes live in Find work right away.";

  return (
    <StepCard
      title="Check and post"
      hint={`${goesTo} ${campaign ? `${money(d.campaign.total)} is held when you post.` : "Nothing is charged until you hire."}`}
      headingRef={headingRef}
    >
      <DefinitionList items={items} className="y-nw-dl" />
      <nav className="y-nw-jump" aria-label="Change an earlier step">
        <span>Change</span>
        {STEP_LABELS.slice(0, 5).map((label, index) => (
          <button key={label} type="button" className="y-nw-link" onClick={() => goTo(index)}>
            {label}
          </button>
        ))}
      </nav>

      <Fld
        field="title"
        label="Title creators see"
        error={titleErr}
        hint={
          form.titleTouched && d.suggestion && form.title !== d.suggestion ? (
            <button type="button" className="y-nw-link" onClick={() => set({ titleTouched: false, title: "" })}>
              Use &ldquo;{d.suggestion}&rdquo;
            </button>
          ) : (
            "Shown first on the card in Find work."
          )
        }
      >
        <input
          className="y-input y-nw-input"
          {...controlProps("title", titleErr)}
          maxLength={TITLE_MAX + 10}
          value={d.title}
          placeholder="e.g. App demos for Notely AI"
          onChange={(event) => set({ title: event.target.value, titleTouched: true })}
        />
      </Fld>

      {campaign ? (
        <div
          id={fieldId("payment")}
          tabIndex={-1}
          className="y-nw-pay"
          data-invalid={payErr ? "true" : undefined}
          aria-describedby={payErr ? errorId("payment") : undefined}
        >
          <PaymentMethodPicker value={form.paymentMethodId} onChange={(paymentMethodId) => set({ paymentMethodId })} />
          <FieldError field="payment" message={payErr} />
        </div>
      ) : null}

      <div className="y-nw-fld">
        <label className="y-nw-chk" data-invalid={agreeErr ? "true" : undefined}>
          <input
            id={fieldId("agree")}
            type="checkbox"
            className="y-check"
            checked={form.agree}
            aria-invalid={agreeErr ? true : undefined}
            aria-describedby={agreeErr ? errorId("agree") : undefined}
            onChange={(event) => set({ agree: event.target.checked })}
          />
          <span>
            The brief is accurate and I&apos;ll review each version within {AUTO_APPROVE_DAYS} days.{" "}
            {campaign ? (
              <>
                <b>{money(d.campaign.total)}</b> is held when I post. Each slot is paid out after I approve its video,
                and unpicked slots are refunded when the campaign closes.
              </>
            ) : (
              <>Nothing is charged until I hire a creator.</>
            )}
          </span>
        </label>
        <FieldError field="agree" message={agreeErr} />
      </div>

      {campaign && d.belowRange ? (
        <p className="y-nw-warn y-nw-warn-row">
          <AlertCircle size={16} aria-hidden />
          The price is below the usual range, so fewer creators may pick your slots. You can still post.
        </p>
      ) : null}
    </StepCard>
  );
}
