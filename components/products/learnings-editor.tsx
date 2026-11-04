"use client";

import { Lightbulb, Plus, X } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { shortDate } from "@/lib/format";
import { commissionById, creatorById } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import type { Learning } from "@/lib/types";

/**
 * Carried-forward feedback for a product: where each learning came from (commission, creator,
 * date), add one by hand, remove one (the caller offers Undo).
 */
export function LearningsEditor({
  learnings,
  onAdd,
  onRemove,
  live,
}: {
  learnings: Learning[];
  onAdd: (text: string) => void;
  onRemove: (learning: Learning, index: number) => void;
  /** True for saved products: changes apply immediately rather than on Save. */
  live: boolean;
}) {
  const s = useDemo();
  const inputId = useId();
  const hintId = useId();
  const [draft, setDraft] = useState("");

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    onAdd(text);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-4">
      {learnings.length ? (
        <ul className="flex flex-col" aria-label="Learnings">
          {learnings.map((learning, index) => {
            const commission = learning.sourceCommissionId
              ? commissionById(s, learning.sourceCommissionId)
              : undefined;
            const creator = learning.creatorId ? creatorById(s, learning.creatorId) : undefined;
            return (
              <li
                key={learning.id}
                className={`flex items-start gap-3 py-3 ${index ? "border-t border-(--b-line)" : "pt-0"}`}
              >
                <span className="mt-0.5 grid size-10 flex-none place-items-center rounded-full bg-(--b-chip)">
                  <Lightbulb size={18} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="y-body break-words">{learning.text}</p>
                  <p className="y-micro y-fg-2 mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    {creator ? (
                      <>
                        <FaceAvatar id={creator.id} name="" size={20} />
                        <span className="font-semibold text-(--b-fg)">{creator.firstName}</span>
                        <span aria-hidden>·</span>
                      </>
                    ) : null}
                    {commission ? (
                      <>
                        <Link href={`/business/commissions/${commission.id}`} className="y-link max-w-[28ch] truncate">
                          {commission.title}
                        </Link>
                        <span aria-hidden>·</span>
                      </>
                    ) : (
                      <>
                        <span>Added by your team</span>
                        <span aria-hidden>·</span>
                      </>
                    )}
                    <span>{shortDate(learning.createdAt)}</span>
                  </p>
                </div>
                <RoundIconButton
                  label={`Remove learning: ${learning.text.slice(0, 48)}`}
                  size="sm"
                  tone="outline"
                  onClick={() => onRemove(learning, index)}
                >
                  <X size={18} aria-hidden />
                </RoundIconButton>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="y-tile flex items-start gap-3 p-4">
          <Lightbulb size={18} aria-hidden className="mt-0.5 flex-none" />
          <p className="y-small y-fg-2">
            Nothing yet. When you approve a video, note what worked and what to change. It lands
            here and goes into every new brief for this product.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="y-label">
          <span>Add a learning</span>
          <span className="y-micro y-fg-3 font-medium">{live ? "Saves right away" : "Saved with the product"}</span>
        </label>
        <textarea
          id={inputId}
          rows={2}
          value={draft}
          maxLength={240}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              add();
            }
          }}
          aria-describedby={hintId}
          placeholder="e.g. Keep the first line under 3 seconds. Viewers dropped off during the logo."
          className="y-input"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p id={hintId} className="y-micro y-fg-3 px-1">
            One clear sentence works best. {draft.length}/240
          </p>
          <PillButton
            variant="soft"
            size="sm"
            icon={<Plus size={16} aria-hidden />}
            onClick={add}
            disabled={!draft.trim()}
          >
            Add learning
          </PillButton>
        </div>
      </div>
    </div>
  );
}
