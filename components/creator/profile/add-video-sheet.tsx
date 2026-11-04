"use client";

import { CheckCircle2, FileVideo, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { VideoThumb } from "@/components/domain/video-thumb";
import { SelectField, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { actions } from "@/lib/store";
import { formatById, formats, isArabic, languageById, languages, niches } from "@/lib/taxonomy";
import type { Aspect, Creator, FormatId, LanguageId, NicheId, Scene, ScriptLine, Video } from "@/lib/types";

const scenes: { value: Scene; label: string }[] = [
  { value: "selfie", label: "Selfie to camera" },
  { value: "split", label: "Face and phone screen" },
  { value: "screen", label: "Screen recording" },
  { value: "desk", label: "At a desk or counter" },
  { value: "street", label: "Out and about" },
];

const aspectOptions: { value: Aspect; label: string }[] = [
  { value: "9:16", label: "9:16" },
  { value: "4:5", label: "4:5" },
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
];

/** Generic beats after the hook, in the video's language, so the player has captions to show. */
function buildScript(hook: string, hookTranslation: string, lang: LanguageId, duration: number): ScriptLine[] {
  const arabic = isArabic(lang);
  const beats: { text: string; en: string; beat: ScriptLine["beat"]; at: number }[] = arabic
    ? [
        { text: "كلنا مرّينا بهالموقف…", en: "We've all been there…", beat: "problem", at: 0.2 },
        { text: "شوفوا كيف يشتغل التطبيق، خطوة بخطوة.", en: "Watch how the app works, step by step.", beat: "demo", at: 0.45 },
        { text: "جربوه اليوم، الرابط في البايو.", en: "Try it today, link in bio.", beat: "cta", at: 0.8 },
      ]
    : [
        { text: "Here's the problem nobody talks about.", en: "", beat: "problem", at: 0.2 },
        { text: "So I tried this. Watch.", en: "", beat: "demo", at: 0.45 },
        { text: "Try it today. Link in bio.", en: "", beat: "cta", at: 0.8 },
      ];
  let last = 0;
  const lines: ScriptLine[] = [
    { at: 0, text: hook, translation: arabic && hookTranslation ? hookTranslation : undefined, beat: "hook" },
  ];
  for (const b of beats) {
    const at = Math.max(last + 1, Math.round(duration * b.at));
    last = at;
    lines.push({ at, text: b.text, translation: arabic ? b.en : undefined, beat: b.beat });
  }
  return lines;
}

type Form = {
  title: string;
  lang: LanguageId;
  hook: string;
  hookTranslation: string;
  format: FormatId;
  duration: string;
  aspect: Aspect;
  scene: Scene;
  niche: NicheId;
  madeFor: string;
  views: string;
};

type Upload = { name: string; size: string; progress: number } | null;

export function AddVideoSheet({
  open,
  onClose,
  creator,
  portfolioCount,
}: {
  open: boolean;
  onClose: () => void;
  creator: Creator;
  portfolioCount: number;
}) {
  const toast = useToast();
  const initial: Form = {
    title: "",
    lang: creator.languages[0] ?? "en",
    hook: "",
    hookTranslation: "",
    format: creator.formats[0] ?? "selfie-demo",
    duration: String(formatById[creator.formats[0] ?? "selfie-demo"].typical[0]),
    aspect: "9:16",
    scene: "selfie",
    niche: creator.niches[0] ?? "consumer",
    madeFor: "",
    views: "",
  };
  const [form, setForm] = useState<Form>(initial);
  const [upload, setUpload] = useState<Upload>(null);
  const [dragging, setDragging] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof Form, boolean>>>({});
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const arabic = isArabic(form.lang);
  const duration = Number(form.duration);
  const views = form.views.trim() ? Number(form.views) : undefined;
  const uploading = upload !== null && upload.progress < 100;
  const errors: Partial<Record<keyof Form | "file", string | null>> = {
    file: !upload ? "Upload the video file first." : uploading ? "Wait for the upload to finish." : null,
    title: form.title.trim().length < 4 ? "Give it a short title (at least 4 characters)." : null,
    hook: form.hook.trim().length < 4 ? "Add the on-screen hook so businesses see how it opens." : null,
    duration:
      Number.isInteger(duration) && duration >= 5 && duration <= 600
        ? null
        : "Enter the length in whole seconds, between 5 and 600.",
    views: views === undefined || (Number.isInteger(views) && views >= 0) ? null : "Views must be a whole number.",
  };
  const errorCount = Object.values(errors).filter(Boolean).length;
  const show = (field: keyof Form | "file") =>
    attempted || (field !== "file" && touched[field as keyof Form]) ? (errors[field] ?? null) : null;
  const update = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const touch = (field: keyof Form) => setTouched((t) => ({ ...t, [field]: true }));

  const tints: Video["tints"] =
    portfolioCount % 2 ? [creator.tints[1], creator.tints[0]] : [creator.tints[0], creator.tints[1]];

  const preview: Video = {
    id: "v-preview",
    creatorId: creator.id,
    title: form.title || "Your new video",
    hook: form.hook || (arabic ? "الجملة الأولى في الفيديو" : "Your opening line"),
    lang: form.lang,
    format: form.format,
    durationSec: Number.isFinite(duration) && duration > 0 ? duration : 30,
    aspect: form.aspect,
    tints,
    scene: form.scene,
    niche: form.niche,
    script: [],
  };

  const startUpload = (file: File) => {
    window.clearInterval(timer.current);
    const mb = file.size / (1024 * 1024);
    setUpload({ name: file.name, size: mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`, progress: 0 });
    if (!form.title.trim()) {
      const base = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
      if (base) update({ title: base.slice(0, 80) });
    }
    let progress = 0;
    timer.current = window.setInterval(() => {
      progress = Math.min(100, progress + 9 + Math.round(Math.random() * 10));
      const value = progress;
      setUpload((u) => (u ? { ...u, progress: value } : u));
      if (value >= 100) window.clearInterval(timer.current);
    }, 180);
  };

  const close = () => {
    window.clearInterval(timer.current);
    setForm(initial);
    setUpload(null);
    setAttempted(false);
    setTouched({});
    onClose();
  };

  const save = () => {
    setAttempted(true);
    if (errorCount) return;
    actions.addPortfolioVideo(creator.id, {
      title: form.title.trim(),
      hook: form.hook.trim(),
      hookTranslation: arabic && form.hookTranslation.trim() ? form.hookTranslation.trim() : undefined,
      lang: form.lang,
      format: form.format,
      durationSec: duration,
      aspect: form.aspect,
      tints,
      scene: form.scene,
      niche: form.niche,
      madeFor: form.madeFor.trim() || undefined,
      stats: views !== undefined ? { views } : undefined,
      script: buildScript(form.hook.trim(), form.hookTranslation.trim(), form.lang, duration),
    });
    toast({ message: `"${form.title.trim()}" is now first in your portfolio.` });
    close();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      width="lg"
      title="Add a video"
      description="Upload a finished piece. Businesses see the first frame and your hook before they press play."
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {attempted && errorCount ? (
            <p role="alert" className="y-small font-medium text-(--y-danger) sm:me-auto">
              Fix {errorCount === 1 ? "1 thing" : `${errorCount} things`} to add this video.
            </p>
          ) : null}
          <div className="flex gap-2">
            <PillButton variant="ghost" onClick={close}>
              Cancel
            </PillButton>
            <PillButton variant="contrast" onClick={save} className="flex-1 sm:flex-none">
              Add to portfolio
            </PillButton>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Upload */}
        <div className="flex flex-col gap-2">
          {upload ? (
            <div className="y-tile flex flex-col gap-3 p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 flex-none place-items-center rounded-full bg-(--b-bg)" aria-hidden>
                  {uploading ? <FileVideo size={18} /> : <CheckCircle2 size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="y-small truncate font-semibold">{upload.name}</p>
                  <p className="y-micro y-fg-2" aria-live="polite">
                    {uploading ? `Uploading… ${upload.progress}%` : `Uploaded · ${upload.size}`}
                  </p>
                </div>
                <label className="y-pill cursor-pointer" data-variant="ghost" data-size="sm">
                  Replace
                  <input
                    type="file"
                    accept="video/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) startUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <span
                className="block h-2 overflow-hidden rounded-full bg-(--b-bg)"
                role="progressbar"
                aria-label="Upload progress"
                aria-valuenow={upload.progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span
                  className="block h-full rounded-full bg-(--b-fg) transition-[width] duration-(--y-dur-2)"
                  style={{ width: `${upload.progress}%` }}
                />
              </span>
            </div>
          ) : (
            <label
              className={`y-dropzone flex cursor-pointer flex-col items-center gap-2 px-4 py-8 text-center ${
                dragging ? "!border-(--b-fg)" : ""
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) startUpload(file);
              }}
            >
              <UploadCloud size={28} aria-hidden />
              <span className="y-small font-semibold">Drop a video here or choose a file</span>
              <span className="y-micro y-fg-2">MP4 or MOV, up to 500 MB. Vertical works best.</span>
              <input
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) startUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
          )}
          {show("file") ? (
            <p className="y-small px-1 font-medium text-(--y-danger)">{show("file")}</p>
          ) : null}
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_180px]">
          <div className="flex flex-col gap-5">
            <TextField
              label="Title"
              required
              maxLength={80}
              placeholder="e.g. Kanz: 'Where did my salary go?'"
              value={form.title}
              onChange={(e) => update({ title: e.target.value })}
              onBlur={() => touch("title")}
              hint="Only you and businesses see this, in English."
              error={show("title")}
            />
            <SelectField
              label="Language"
              required
              value={form.lang}
              onChange={(e) => update({ lang: e.target.value as LanguageId })}
              options={languages.map((l) => ({ value: l.id, label: l.name }))}
            />
            <TextField
              label="On-screen hook"
              required
              maxLength={90}
              dir={arabic ? "rtl" : "ltr"}
              lang={arabic ? "ar" : "en"}
              placeholder={arabic ? "أرسلت الفاتورة على الواتساب… في عشر ثواني" : "I sent the invoice in ten seconds"}
              value={form.hook}
              onChange={(e) => update({ hook: e.target.value })}
              onBlur={() => touch("hook")}
              hint={arabic ? `In ${languageById[form.lang].short}, as it appears in the video.` : "The first line viewers read."}
              error={show("hook")}
            />
            {arabic ? (
              <TextField
                label="Hook in English"
                maxLength={120}
                placeholder="I sent the invoice on WhatsApp… in ten seconds"
                value={form.hookTranslation}
                onChange={(e) => update({ hookTranslation: e.target.value })}
                hint="Helps businesses who don't speak the dialect."
              />
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <p className="y-label">Preview</p>
            <div className="mx-auto w-40 md:w-full">
              <VideoThumb video={preview} decorative />
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Format"
            required
            value={form.format}
            onChange={(e) => update({ format: e.target.value as FormatId })}
            options={formats.map((f) => ({ value: f.id, label: f.name }))}
          />
          <TextField
            label="Length in seconds"
            required
            type="number"
            inputMode="numeric"
            min={5}
            max={600}
            value={form.duration}
            onChange={(e) => update({ duration: e.target.value })}
            onBlur={() => touch("duration")}
            error={show("duration")}
          />
          <SelectField
            label="Scene"
            required
            value={form.scene}
            onChange={(e) => update({ scene: e.target.value as Scene })}
            options={scenes}
          />
          <SelectField
            label="Industry"
            required
            value={form.niche}
            onChange={(e) => update({ niche: e.target.value as NicheId })}
            options={niches.map((n) => ({ value: n.id, label: n.name }))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="y-label" id="aspect-label">
            <span>Aspect ratio</span>
            <span className="y-micro y-fg-3 font-medium">Required</span>
          </p>
          <SegmentedToggle label="Aspect ratio" value={form.aspect} onChange={(aspect) => update({ aspect })} options={aspectOptions} size="md" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Made for"
            maxLength={40}
            placeholder="Brand name, or leave empty for a spec piece"
            value={form.madeFor}
            onChange={(e) => update({ madeFor: e.target.value })}
          />
          <TextField
            label="Views"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="If the client shared results"
            value={form.views}
            onChange={(e) => update({ views: e.target.value })}
            onBlur={() => touch("views")}
            error={show("views")}
          />
        </div>
      </div>
    </Sheet>
  );
}
