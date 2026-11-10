import type { Learning, NicheId, Product, ProductAsset } from "@/lib/types";

/* Form model for the product editor. Pure helpers only (safe anywhere). */

export type Surface = Product["surfaces"][number];

export const surfaceOptions: { id: Surface; label: string }[] = [
  { id: "ios", label: "iPhone" },
  { id: "android", label: "Android" },
  { id: "web", label: "Web" },
];

/** Suggested voice words; businesses can add their own. */
export const toneSuggestions = [
  "Casual",
  "Warm",
  "Straight-talking",
  "Funny",
  "Relatable",
  "Calm",
  "Clear",
  "Practical",
  "Friendly",
  "Honest",
  "Energetic",
  "Playful",
  "Expert",
  "Premium",
];

/** Brand colours that keep white text readable (contrast ≥ 4.5). */
export const brandPalette: { value: string; name: string }[] = [
  { value: "#0F7A5C", name: "Green" },
  { value: "#0E7490", name: "Teal" },
  { value: "#1F4FD1", name: "Blue" },
  { value: "#1D1D6B", name: "Navy" },
  { value: "#6D28D9", name: "Violet" },
  { value: "#BE185D", name: "Pink" },
  { value: "#B4232A", name: "Red" },
  { value: "#B45309", name: "Amber" },
  { value: "#0E0E10", name: "Black" },
];

export type ProductForm = {
  name: string;
  oneLiner: string;
  description: string;
  website: string;
  niche: NicheId;
  surfaces: Surface[];
  brandColor: string;
  problem: string;
  audience: string;
  features: string[];
  tone: string[];
  dos: string[];
  donts: string[];
  cta: string;
  assets: ProductAsset[];
};

export type RequiredField = "name" | "oneLiner" | "audience" | "problem";
export type FieldErrors = Partial<Record<RequiredField | "website", string>>;

export function emptyForm(niche: NicheId): ProductForm {
  return {
    name: "",
    oneLiner: "",
    description: "",
    website: "",
    niche,
    surfaces: ["ios", "android"],
    brandColor: brandPalette[0].value,
    problem: "",
    audience: "",
    features: [],
    tone: [],
    dos: [],
    donts: [],
    cta: "",
    assets: [],
  };
}

export function formFromProduct(product: Product): ProductForm {
  return {
    name: product.name,
    oneLiner: product.oneLiner,
    description: product.description,
    website: product.website,
    niche: product.niche,
    surfaces: [...product.surfaces],
    brandColor: product.brandColor,
    problem: product.problem,
    audience: product.audience,
    features: [...product.features],
    tone: [...product.tone],
    dos: [...product.dos],
    donts: [...product.donts],
    cta: product.cta,
    assets: product.assets.map((asset) => ({ ...asset })),
  };
}

const clean = (items: string[]) => items.map((item) => item.trim()).filter(Boolean);

/** What gets passed to `actions.saveProduct` (learnings are handled separately). */
export function toSaveInput(form: ProductForm, extra: { id?: string; learnings?: Learning[] }) {
  return {
    ...(extra.id ? { id: extra.id } : {}),
    ...(extra.learnings ? { learnings: extra.learnings } : {}),
    name: form.name.trim(),
    oneLiner: form.oneLiner.trim(),
    description: form.description.trim(),
    website: form.website.trim().replace(/^https?:\/\//, "").replace(/\/$/, ""),
    niche: form.niche,
    surfaces: form.surfaces,
    audience: form.audience.trim(),
    problem: form.problem.trim(),
    features: clean(form.features),
    tone: clean(form.tone),
    dos: clean(form.dos),
    donts: clean(form.donts),
    cta: form.cta.trim(),
    brandColor: form.brandColor,
    assets: form.assets,
  };
}

export function validate(form: ProductForm): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.name.trim()) errors.name = "Give your product a name, like “Daftar Invoices”.";
  if (!form.oneLiner.trim())
    errors.oneLiner = "Add a one-liner: what it does, in one sentence.";
  if (!form.audience.trim())
    errors.audience = "Say who it's for, so creators know who they're talking to.";
  if (!form.problem.trim())
    errors.problem = "Describe the problem it solves. It's the hook of most videos.";
  const site = form.website.trim();
  if (site && !/^(https?:\/\/)?[^\s/]+\.[^\s/]{2,}(\/\S*)?$/i.test(site))
    errors.website = "Enter a web address like daftar.app/invoices, or leave it empty.";
  return errors;
}

export const fieldOrder: (keyof FieldErrors)[] = ["name", "oneLiner", "website", "problem", "audience"];

/** Stable comparison for the unsaved-changes guard. */
export const sameForm = (a: ProductForm, b: ProductForm) => JSON.stringify(a) === JSON.stringify(b);

/** 2_400_000 → "2.3 MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

/** Best guess at what an uploaded file is, from its name and type. */
export function guessAssetKind(name: string, type: string): ProductAsset["kind"] {
  const lower = name.toLowerCase();
  if (/logo|icon|mark/.test(lower)) return "logo";
  if (/brand|guide|voice|style/.test(lower)) return "brand-guide";
  if (/login|demo.?account|credentials/.test(lower)) return "demo-account";
  if (type.startsWith("video/") || /footage|b-?roll|raw|\.(mp4|mov|m4v|webm)$/.test(lower))
    return "footage";
  if (type === "application/pdf" || lower.endsWith(".pdf")) return "brand-guide";
  return "screens";
}
