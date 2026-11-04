"use client";

import { CloudUpload, KeyRound, Plus, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import type { ProductAsset } from "@/lib/types";

import { formatBytes, guessAssetKind } from "./product-form";
import { AssetIcon, assetKinds } from "./product-mark";

/**
 * Product files: upload (picker or drag and drop) adds the real file name and size to the form,
 * plus a quick way to add demo-account login details. Saved with the product.
 */
export function AssetsEditor({
  assets,
  onAdd,
  onRemove,
}: {
  assets: ProductAsset[];
  onAdd: (assets: ProductAsset[]) => void;
  onRemove: (asset: ProductAsset, index: number) => void;
}) {
  const inputId = useId();
  const hintId = useId();
  const [over, setOver] = useState(false);
  const [login, setLogin] = useState("");
  const counter = useRef(0);

  const nextId = () => {
    counter.current += 1;
    return `as-${Date.now().toString(36)}-${counter.current}`;
  };

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onAdd(
      Array.from(files).map((file) => ({
        id: nextId(),
        name: file.name,
        kind: guessAssetKind(file.name, file.type),
        size: formatBytes(file.size),
      })),
    );
  };

  const addLogin = () => {
    const text = login.trim();
    if (!text) return;
    onAdd([{ id: nextId(), name: `Demo account login (${text})`, kind: "demo-account", size: "Login details" }]);
    setLogin("");
  };

  return (
    <div className="flex flex-col gap-4">
      <label
        htmlFor={inputId}
        data-over={over ? "true" : undefined}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          addFiles(event.dataTransfer.files);
        }}
        className="y-dropzone flex cursor-pointer flex-col items-center gap-2 px-5 py-7 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--b-fg)"
      >
        <span className="grid size-12 place-items-center rounded-full bg-(--b-fg) text-(--b-bg)" aria-hidden>
          <CloudUpload size={22} />
        </span>
        <span className="y-small">
          <span className="y-link font-semibold">Upload files</span>{" "}
          <span className="y-fg-2">or drop them here</span>
        </span>
        <span id={hintId} className="y-micro y-fg-2 max-w-[44ch]">
          Logo, app screens, brand guide or footage. Only the creator you hire can open them.
        </span>
        <input
          id={inputId}
          type="file"
          multiple
          aria-describedby={hintId}
          className="sr-only"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${inputId}-login`} className="y-label">
          <span className="inline-flex items-center gap-1.5">
            <KeyRound size={15} aria-hidden /> Demo account
          </span>
          <span className="y-micro y-fg-3 font-medium">Optional</span>
        </label>
        <div className="flex gap-2">
          <input
            id={`${inputId}-login`}
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addLogin();
              }
            }}
            placeholder="Which account, e.g. Shop: Al-Noor Perfumes"
            className="y-input min-w-0 flex-1"
          />
          <PillButton
            variant="soft"
            icon={<Plus size={18} aria-hidden />}
            onClick={addLogin}
            disabled={!login.trim()}
            aria-label="Add demo account"
          >
            Add
          </PillButton>
        </div>
        <p className="y-micro y-fg-3 px-1">
          A ready-made account lets creators film real screens without touching your live data.
        </p>
      </div>

      {assets.length ? (
        <ul className="flex flex-col gap-2" aria-label="Files">
          {assets.map((asset, index) => (
            <li key={asset.id} className="y-tile flex items-center gap-3 p-2 ps-3">
              <span className="grid size-10 flex-none place-items-center rounded-full bg-(--b-bg)">
                <AssetIcon kind={asset.kind} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="y-small block truncate font-semibold" title={asset.name}>
                  {asset.name}
                </span>
                <span className="y-micro y-fg-2 block">
                  {assetKinds[asset.kind].label} · {asset.size}
                </span>
              </span>
              <RoundIconButton label={`Remove ${asset.name}`} size="sm" tone="outline" onClick={() => onRemove(asset, index)}>
                <X size={18} aria-hidden />
              </RoundIconButton>
            </li>
          ))}
        </ul>
      ) : (
        <p className="y-small y-fg-2 px-1">No files yet.</p>
      )}
    </div>
  );
}
