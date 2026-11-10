"use client";

import { BadgeCheck, Globe, History, MailOpen, Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BrandTile } from "@/components/ui/brand-tile";
import { AvatarStack, FaceAvatar } from "@/components/ui/face-avatar";
import { Note } from "@/components/ui/note";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { DAY, NOW } from "@/lib/clock";
import { plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { cityById, fit, me, savedCreatorIds } from "@/lib/selectors";
import { actions } from "@/lib/store";
import {
  ORDER_OPEN_DAYS,
  campaignPlatformById,
  campaignPlatforms,
  creatorKindById,
  creatorKinds,
  formatById,
  formats,
  languages,
  nicheById,
  platforms,
} from "@/lib/taxonomy";
import type { CampaignPlatformId, ContentRequest, Creator, FormatId, Product } from "@/lib/types";

import {
  NEW_PRODUCT,
  PRODUCT_NAME_MAX,
  applyProduct,
  briefFrom,
  errorId,
  fieldId,
  postedBudget,
  type NewOrderForm,
} from "./model";
import { controlProps, FieldError, Fld, HandleRows, PillGroup, StepCard } from "./parts";
import type { StepProps } from "./step-props";

const surfaceLabel = { ios: "iOS", android: "Android", web: "Web" } as const;

/** Step 3: product, format, where it goes, the accounts to tag, language, who can pitch. */
export function BasicsStep(props: StepProps) {
  const { form, d, set, err, headingRef } = props;
  const toast = useToast();
  const [moved, setMoved] = useState<string | null>(null);
  const campaign = form.kind === "campaign";

  const pickProduct = (product: Product) => {
    if (form.category && product.niche !== form.category) {
      setMoved(`Category is now ${nicheById[product.niche].name}, to match ${product.name}.`);
    } else setMoved(null);
    set((f) => applyProduct(f, product, d.products.find((p) => p.id === f.productId)));
  };

  const chooseFormat = (id: FormatId) =>
    set((f) => {
      if (f.format === id) return {};
      const [, hi] = formatById[id].typical;
      return { format: id, durationSec: hi, onCamera: !formatById[id].voiceOnly };
    });

  const saveHandle = (platform: CampaignPlatformId, value: string) => {
    const saved = actions.saveBrandHandle(platform, value);
    if (saved) {
      set((f) => {
        const handles = { ...f.handles };
        delete handles[platform];
        return { handles };
      });
      toast({ message: `Saved ${saved} for ${campaignPlatformById[platform].name}` });
    }
  };

  return (
    <StepCard title="The basics" headingRef={headingRef}>
      <ProductField {...props} onPick={pickProduct} moved={moved} />

      {!d.adCopy ? (
        <Fld field="format" label="Format" group labelId="nw-format-label" error={err("format")}>
          <PillGroup<FormatId>
            field="format"
            labelId="nw-format-label"
            error={err("format")}
            options={formats.map((f) => ({ value: f.id, label: f.name }))}
            selected={form.format ? [form.format] : []}
            onToggle={chooseFormat}
          />
        </Fld>
      ) : null}

      {campaign ? (
        <>
          <Fld
            field="platforms"
            label="Platforms"
            note="pick one or more"
            group
            labelId="nw-plat-label"
            error={err("platforms")}
            hint="Creators post on one of these, on their own account. Only platforms we can verify followers on."
          >
            <PillGroup<CampaignPlatformId>
              field="platforms"
              labelId="nw-plat-label"
              error={err("platforms")}
              multiple
              checkmark
              options={campaignPlatforms.map((p) => ({ value: p.id, label: p.name }))}
              selected={form.campaignPlatforms}
              onToggle={(id) =>
                set((f) => ({
                  campaignPlatforms: f.campaignPlatforms.includes(id)
                    ? f.campaignPlatforms.filter((p) => p !== id)
                    : campaignPlatforms.map((p) => p.id).filter((p) => p === id || f.campaignPlatforms.includes(p)),
                }))
              }
            />
          </Fld>
          {form.campaignPlatforms.length ? (
            <Fld
              field="handles"
              label="Accounts creators should tag"
              group
              hint={
                <>
                  Entered once and saved to your brand profile. Change them here any time, or in{" "}
                  <Link href={paths.settings("brand")} className="y-nw-inline-link">
                    Settings → Brand accounts
                  </Link>
                  .
                </>
              }
            >
              <HandleRows
                platforms={form.campaignPlatforms}
                handles={d.handles}
                saved={d.savedHandles}
                error={err}
                onChange={(platform, value) => set((f) => ({ handles: { ...f.handles, [platform]: value } }))}
                onSave={saveHandle}
              />
            </Fld>
          ) : null}
        </>
      ) : !d.adCopy ? (
        <Fld
          field="platforms"
          label="Where you'll run it"
          note="pick one or more"
          group
          labelId="nw-plat-label"
          error={err("platforms")}
          hint="Creators frame captions, safe zones and pacing for these."
        >
          <PillGroup
            field="platforms"
            labelId="nw-plat-label"
            error={err("platforms")}
            multiple
            checkmark
            options={platforms.map((p) => ({ value: p.id, label: p.name }))}
            selected={form.platforms}
            onToggle={(id) =>
              set((f) => ({
                platforms: f.platforms.includes(id)
                  ? f.platforms.filter((p) => p !== id)
                  : platforms.map((p) => p.id).filter((p) => p === id || f.platforms.includes(p)),
              }))
            }
          />
        </Fld>
      ) : null}

      <Fld
        field="languages"
        label={d.adCopy ? "Language" : "Video language"}
        note="pick one or more"
        group
        labelId="nw-lang-label"
        error={err("languages")}
        hint={
          d.adCopy
            ? "The language the copy is written in."
            : "Creators who make videos in every language you pick rank first. A video that isn't in English comes with a translation."
        }
      >
        <PillGroup
          field="languages"
          labelId="nw-lang-label"
          error={err("languages")}
          multiple
          checkmark
          options={languages.map((l) => ({ value: l.id, label: l.name }))}
          selected={form.languages}
          onToggle={(id) =>
            set((f) => ({
              languages: f.languages.includes(id)
                ? f.languages.filter((l) => l !== id)
                : languages.map((l) => l.id).filter((l) => l === id || f.languages.includes(l)),
            }))
          }
        />
      </Fld>

      {!campaign ? <WhoCanPitch {...props} /> : null}
    </StepCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Product                                                                     */
/* -------------------------------------------------------------------------- */

function ProductTile({
  product,
  checked,
  onChange,
}: {
  product: Pick<Product, "id" | "name" | "oneLiner" | "brandColor" | "surfaces" | "learnings">;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="y-nw-ptile" data-checked={checked ? "true" : undefined}>
      <input type="radio" name="nw-product" className="sr-only" checked={checked} onChange={onChange} />
      <BrandTile name={product.name} color={product.brandColor} size={40} />
      <span className="min-w-0 flex-1">
        <b>{product.name}</b>
        <span className="y-nw-ptile-line">{product.oneLiner}</span>
        {product.learnings.length ? (
          <span className="y-nw-ptile-meta">
            <History size={13} aria-hidden />
            {plural(product.learnings.length, "learning")} carried forward
          </span>
        ) : product.surfaces.length ? (
          <span className="y-nw-ptile-meta">{product.surfaces.map((x) => surfaceLabel[x]).join(" · ")}</span>
        ) : null}
      </span>
    </label>
  );
}

function ProductField({ form, d, set, err, onPick, moved }: StepProps & { onPick: (p: Product) => void; moved: string | null }) {
  const productErr = err("product");
  const nameErr = err("newName");
  const inCategory = d.products.filter((p) => !form.category || p.niche === form.category);
  const others = d.products.filter((p) => form.category && p.niche !== form.category);
  const creating = form.productId === NEW_PRODUCT;
  const returnTo = paths.newOrder({ draft: form.kind ?? undefined });
  return (
    <div className="y-nw-fld">
      <span className="y-nw-lb" id="nw-product-label">
        Product
      </span>
      <div
        id={fieldId("product")}
        role="radiogroup"
        aria-labelledby="nw-product-label"
        aria-describedby={productErr ? errorId("product") : undefined}
        data-invalid={productErr ? "true" : undefined}
        tabIndex={-1}
        className="y-nw-products"
      >
        {inCategory.map((p) => (
          <ProductTile key={p.id} product={p} checked={form.productId === p.id} onChange={() => onPick(p)} />
        ))}
        {others.length ? (
          <p className="y-nw-small y-nw-products-sep">In other categories</p>
        ) : null}
        {others.map((p) => (
          <ProductTile key={p.id} product={p} checked={form.productId === p.id} onChange={() => onPick(p)} />
        ))}
        <label className="y-nw-ptile" data-checked={creating ? "true" : undefined} data-new="true">
          <input
            type="radio"
            name="nw-product"
            className="sr-only"
            checked={creating}
            onChange={() => set({ productId: NEW_PRODUCT })}
          />
          <span className="y-nw-ptile-plus" aria-hidden>
            <Plus size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <b>New product</b>
            <span className="y-nw-ptile-line">A name is enough to start. It&apos;s saved for your next order.</span>
          </span>
        </label>
      </div>
      <FieldError field="product" message={productErr} />
      {moved && d.product ? <Note size="sm">{moved}</Note> : null}

      {creating ? (
        <div className="y-nw-newproduct">
          <Fld field="newName" label="Product name" error={nameErr}>
            <input
              className="y-input y-nw-input"
              {...controlProps("newName", nameErr)}
              placeholder="e.g. Notely AI"
              maxLength={PRODUCT_NAME_MAX}
              value={form.newProduct.name}
              onChange={(event) => set((f) => ({ newProduct: { ...f.newProduct, name: event.target.value } }))}
            />
          </Fld>
          <Fld field="newLine" label="One line about it" optional>
            <input
              id="nwf-newLine"
              className="y-input y-nw-input"
              placeholder="e.g. Turns messy meeting notes into a one-tap summary"
              maxLength={140}
              value={form.newProduct.oneLiner}
              onChange={(event) => set((f) => ({ newProduct: { ...f.newProduct, oneLiner: event.target.value } }))}
            />
          </Fld>
          <p className="y-nw-small">
            Saved in {form.category ? nicheById[form.category].name : "your products"} when you post.{" "}
            <Link
              href={`${paths.newProduct}?return=${encodeURIComponent(returnTo)}`}
              className="y-nw-inline-link"
            >
              Add a full product with audience, tone and files
            </Link>
          </p>
        </div>
      ) : d.product ? (
        <ProductContext product={d.product} />
      ) : null}
    </div>
  );
}

/** What creators get with the brief, so the brand sees it once. */
function ProductContext({ product }: { product: Product }) {
  const files = product.assets.length;
  const demo = product.assets.some((a) => a.kind === "demo-account");
  return (
    <div className="y-nw-context">
      <div className="y-nw-context-h">
        <span className="y-nw-small">What creators will know about {product.name}</span>
        <Link href={paths.product(product.id)} className="y-nw-link">
          Edit product
        </Link>
      </div>
      <p className="y-nw-context-p">{product.problem || product.oneLiner}</p>
      <p className="y-nw-small">
        {[
          product.tone.length ? product.tone.join(", ") : null,
          files ? `${plural(files, "file")}${demo ? " · demo login" : ""}` : "No files yet",
          product.learnings.length ? `${plural(product.learnings.length, "learning")} carried into the brief` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Who can pitch (custom orders)                                               */
/* -------------------------------------------------------------------------- */

function WhoCanPitch(props: StepProps) {
  const { s, form, set, err } = props;
  const [open, setOpen] = useState(false);
  const invitesErr = err("invites");
  const invited = form.invitedCreatorIds
    .map((id) => s.creators.find((c) => c.id === id))
    .filter((c): c is Creator => Boolean(c));
  const names =
    invited.length <= 2
      ? invited.map((c) => c.firstName).join(" and ")
      : `${invited[0].firstName}, ${invited[1].firstName} and ${invited.length - 2} more`;
  return (
    <>
      <Fld field="visibility" label="Who can pitch" group labelId="nw-who-label">
        <div role="radiogroup" aria-labelledby="nw-who-label" className="y-nw-who">
          <label className="y-nw-ptile" data-checked={form.visibility === "public" ? "true" : undefined}>
            <input
              type="radio"
              name="nw-who"
              className="sr-only"
              checked={form.visibility === "public"}
              onChange={() => set({ visibility: "public" })}
            />
            <span className="y-nw-ptile-plus" aria-hidden>
              <Globe size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <b>Everyone who fits</b>
              <span className="y-nw-ptile-line">Listed in Find work. Anyone you invite hears about it first.</span>
            </span>
          </label>
          <label className="y-nw-ptile" data-checked={form.visibility === "invite" ? "true" : undefined}>
            <input
              type="radio"
              name="nw-who"
              className="sr-only"
              checked={form.visibility === "invite"}
              onChange={() => set({ visibility: "invite" })}
            />
            <span className="y-nw-ptile-plus" aria-hidden>
              <MailOpen size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <b>Invited creators only</b>
              <span className="y-nw-ptile-line">Only the creators you pick can see it and pitch.</span>
            </span>
          </label>
        </div>
      </Fld>

      <div className="y-nw-fld">
        <div
          id={fieldId("invites")}
          tabIndex={-1}
          className="y-nw-invites"
          data-invalid={invitesErr ? "true" : undefined}
          aria-describedby={invitesErr ? errorId("invites") : undefined}
        >
          {invited.length ? (
            <>
              <AvatarStack size={28} people={invited.map((c) => ({ id: c.id, name: c.name }))} />
              <span className="min-w-0 flex-1">
                <b>{names}</b> invited
              </span>
            </>
          ) : (
            <span className="min-w-0 flex-1 y-nw-muted">
              {form.visibility === "invite" ? "Nobody invited yet." : "Invite anyone in particular? Optional."}
            </span>
          )}
          <PillButton size="sm" variant="soft" icon={<UserPlus size={16} aria-hidden />} onClick={() => setOpen(true)}>
            {invited.length ? "Change" : "Invite creators"}
          </PillButton>
        </div>
        <FieldError field="invites" message={invitesErr} />
      </div>

      <Fld field="preferredKinds" label="Any preference on who makes it?" optional group labelId="nw-kinds-label" hint="Only nudges the order of pitches. Nobody is left out.">
        <PillGroup
          field="preferredKinds"
          labelId="nw-kinds-label"
          multiple
          checkmark
          options={creatorKinds.map((k) => ({ value: k.id, label: k.name }))}
          selected={form.preferredKinds}
          onToggle={(id) =>
            set((f) => ({
              preferredKinds: f.preferredKinds.includes(id)
                ? f.preferredKinds.filter((k) => k !== id)
                : [...f.preferredKinds, id],
            }))
          }
        />
      </Fld>

      <InviteSheet {...props} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** A throwaway order so `fit()` can rank creators against the brief so far. */
function previewOrder(props: StepProps): ContentRequest {
  const { form, d } = props;
  return {
    id: "preview",
    businessId: me.ids(props.s).businessId,
    title: d.title || "Your custom order",
    brief: briefFrom(form, d, d.product?.id ?? ""),
    budget: postedBudget(form, d),
    dueDate: new Date(NOW + (ORDER_OPEN_DAYS + form.deadlineDays) * DAY).toISOString(),
    postedAt: new Date(NOW).toISOString(),
    closesAt: new Date(NOW + ORDER_OPEN_DAYS * DAY).toISOString(),
    status: "open",
    visibility: form.visibility,
    invitedCreatorIds: form.invitedCreatorIds,
    preferredKinds: form.preferredKinds,
    slots: 1,
    views: 0,
    kind: "custom",
  };
}

function InviteSheet(props: StepProps & { open: boolean; onClose: () => void }) {
  const { s, form, set, open, onClose } = props;
  if (!open) return null;
  const self = s.accounts.find((a) => a.id === s.activeAccountId)?.creatorId;
  const temp = previewOrder(props);
  const saved = savedCreatorIds(s)
    .filter((id) => id !== self)
    .map((id) => s.creators.find((c) => c.id === id))
    .filter((c): c is Creator => Boolean(c));
  const savedIds = new Set(saved.map((c) => c.id));
  const ranked = s.creators
    .filter((c) => c.id !== self && !savedIds.has(c.id))
    .map((creator) => ({ creator, fit: fit(s, creator, temp) }))
    .sort((a, b) => b.fit.score - a.fit.score)
    .slice(0, 8);
  const extra = form.invitedCreatorIds
    .filter((id) => id !== self && !savedIds.has(id) && !ranked.some((r) => r.creator.id === id))
    .map((id) => s.creators.find((c) => c.id === id))
    .filter((c): c is Creator => Boolean(c));
  const toggle = (id: string) =>
    set((f) => ({
      invitedCreatorIds: f.invitedCreatorIds.includes(id)
        ? f.invitedCreatorIds.filter((x) => x !== id)
        : [...f.invitedCreatorIds, id],
    }));
  const row = (creator: Creator) => {
    const f = fit(s, creator, temp);
    const on = form.invitedCreatorIds.includes(creator.id);
    return (
      <li key={creator.id}>
        <label className="y-nw-invite" data-checked={on ? "true" : undefined}>
          <FaceAvatar id={creator.id} name="" size={40} />
          <span className="min-w-0 flex-1">
            <b className="flex items-center gap-1">
              <span className="truncate">{creator.name}</span>
              {creator.verified ? <BadgeCheck size={14} aria-label="ID verified" className="flex-none" /> : null}
            </b>
            <small>
              {creatorKindById[creator.kind].name} · {cityById(creator.cityId)?.name} · {f.score}% fit
            </small>
          </span>
          <input
            type="checkbox"
            className="y-check"
            checked={on}
            onChange={() => toggle(creator.id)}
            aria-label={`Invite ${creator.name}`}
          />
        </label>
      </li>
    );
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title="Invite creators"
      description="Invited creators get a personal note and see your order first."
      footer={
        <PillButton variant="contrast" className="w-full" onClick={onClose}>
          {form.invitedCreatorIds.length ? `Done · ${plural(form.invitedCreatorIds.length, "creator")} invited` : "Done"}
        </PillButton>
      }
    >
      <div className="flex flex-col gap-5">
        {extra.length ? (
          <section className="flex flex-col gap-2">
            <h3 className="y-nw-small">Already picked</h3>
            <ul className="flex flex-col gap-2">{extra.map(row)}</ul>
          </section>
        ) : null}
        {saved.length ? (
          <section className="flex flex-col gap-2">
            <h3 className="y-nw-small">Your saved creators</h3>
            <ul className="flex flex-col gap-2">{saved.map(row)}</ul>
          </section>
        ) : null}
        <section className="flex flex-col gap-2">
          <h3 className="y-nw-small">Best fits for this brief</h3>
          <ul className="flex flex-col gap-2">{ranked.map((r) => row(r.creator))}</ul>
        </section>
      </div>
    </Sheet>
  );
}

/** A creator passed in the URL (`?creator=`): invite-only, with them invited. */
export function inviteFromParam(form: NewOrderForm, creatorId: string): NewOrderForm {
  return {
    ...form,
    kind: "custom",
    visibility: "invite",
    invitedCreatorIds: form.invitedCreatorIds.includes(creatorId) ? form.invitedCreatorIds : [...form.invitedCreatorIds, creatorId],
  };
}
