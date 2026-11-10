"use client";

import { useState } from "react";

import { FieldShell } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";

/**
 * Confirmation dialog for destructive actions. With `typed`, the person must type that word
 * (case-insensitive) before the confirm button unlocks.
 */
export function ConfirmSheet({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
  typed,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: () => void;
  typed?: string;
  children?: React.ReactNode;
}) {
  const [value, setValue] = useState("");
  const ready = !typed || value.trim().toLowerCase() === typed.toLowerCase();
  const close = () => {
    setValue("");
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={close}
      title={title}
      description={description}
      side="center"
      width="sm"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <PillButton variant="ghost" onClick={close}>
            Cancel
          </PillButton>
          <PillButton
            variant="contrast"
            disabled={!ready}
            onClick={() => {
              if (!ready) return;
              setValue("");
              onConfirm();
            }}
          >
            {confirmLabel}
          </PillButton>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {children}
        {typed ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!ready) return;
              setValue("");
              onConfirm();
            }}
          >
            <FieldShell label={`Type ${typed} to confirm`} optionalLabel={false}>
              {({ id, describedBy }) => (
                <input
                  id={id}
                  aria-describedby={describedBy}
                  className="y-input"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  data-autofocus
                />
              )}
            </FieldShell>
          </form>
        ) : null}
      </div>
    </Sheet>
  );
}
