"use client";

import { useId, useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { me } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { campaignPlatforms } from "@/lib/taxonomy";
import type { CampaignPlatformId } from "@/lib/types";

const HANDLE = /^[A-Za-z0-9._]{2,30}$/;

/**
 * Settings → Brand accounts: the account creators tag on each campaign platform (Work spec
 * 6.11.6). One per platform, saved on this account's buyer profile with `saveBrandHandle`; the new
 * order form fills them in and saves back what the brand changes there.
 */
export function BrandAccounts() {
  const s = useDemo();
  const saved = me.brandHandles(s);
  return (
    <ul className="flex flex-col divide-y divide-(--b-line)">
      {campaignPlatforms.map((platform) => (
        <HandleRow key={platform.id} platform={platform.id} name={platform.name} saved={saved[platform.id]} />
      ))}
    </ul>
  );
}

function HandleRow({ platform, name, saved }: { platform: CampaignPlatformId; name: string; saved?: string }) {
  const toast = useToast();
  const inputId = useId();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    setValue(saved?.replace(/^@/, "") ?? "");
    setError(null);
    setEditing(true);
  };

  const save = () => {
    const bare = value.trim().replace(/^@+/, "");
    if (!bare) {
      setError(`Add the ${name} account creators should tag.`);
      return;
    }
    if (!HANDLE.test(bare)) {
      setError("Use letters, numbers, dots or underscores (2–30).");
      return;
    }
    const result = actions.saveBrandHandle(platform, bare);
    if (!result) {
      setError("Use letters, numbers, dots or underscores (2–30).");
      return;
    }
    setEditing(false);
    toast({ message: `Saved ${result} for ${name}` });
  };

  const remove = () => {
    const before = saved;
    actions.saveBrandHandle(platform, null);
    toast({
      message: `Removed the ${name} account`,
      action: before ? { label: "Undo", onClick: () => actions.saveBrandHandle(platform, before) } : undefined,
    });
  };

  return (
    <li className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className="y-small w-28 flex-none font-semibold">{name}</span>
        {editing ? (
          <form
            className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <label htmlFor={inputId} className="sr-only">
              {name} account creators should tag
            </label>
            <span className="y-input flex min-w-0 flex-1 items-center gap-0.5 !min-h-11 basis-48">
              <span aria-hidden className="y-fg-2">
                @
              </span>
              <input
                id={inputId}
                value={value}
                maxLength={31}
                autoComplete="off"
                spellCheck={false}
                placeholder="yourbrand"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${inputId}-error` : undefined}
                onChange={(event) => {
                  setValue(event.target.value.replace(/^@+/, ""));
                  if (error) setError(null);
                }}
                className="min-w-0 flex-1 bg-transparent outline-none"
                data-autofocus
              />
            </span>
            <PillButton type="submit" size="sm" variant="contrast">
              Save
            </PillButton>
            <PillButton type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </PillButton>
          </form>
        ) : saved ? (
          <>
            <span className="y-small min-w-0 flex-1 truncate font-medium">
              {saved}
              <span className="y-badge ms-2" data-tone-badge="success">
                Saved
              </span>
            </span>
            <PillButton size="sm" variant="soft" onClick={start} aria-label={`Change the ${name} account`}>
              Change
            </PillButton>
            <PillButton size="sm" variant="ghost" onClick={remove} aria-label={`Remove the ${name} account`}>
              Remove
            </PillButton>
          </>
        ) : (
          <>
            <span className="y-small y-fg-2 min-w-0 flex-1">Not added yet</span>
            <PillButton size="sm" variant="soft" onClick={start} aria-label={`Add the ${name} account`}>
              Add
            </PillButton>
          </>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="y-small ps-0 font-medium text-(--y-danger) sm:ps-31">
          {error}
        </p>
      ) : null}
    </li>
  );
}
