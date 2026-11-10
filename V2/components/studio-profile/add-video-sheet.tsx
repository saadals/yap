"use client";

import { CheckCircle2, ChevronDown, FileVideo, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { VideoThumb } from "@/components/domain/video-thumb";
import { SelectField, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { actions } from "@/lib/store";
import { formatById, formats, isTranslated, languageById, languages, niches, textDir } from "@/lib/taxonomy";
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

/** Generic lines after the hook in each language (problem, demo, call to action), from V1. */
const genericLines: Record<LanguageId, [string, string, string]> = {
  en: ["Here's the problem nobody talks about.", "So I tried this. Watch.", "Try it today. Link in bio."],
  es: ["A todos nos ha pasado…", "Mira cómo funciona la app, paso a paso.", "Pruébala hoy. El link está en mi bio."],
  fr: ["On est tous passés par là…", "Regardez comment l'appli fonctionne, étape par étape.", "Essayez-la aujourd'hui. Le lien est dans ma bio."],
  ar: ["كلنا مررنا بهذا الموقف…", "شاهدوا كيف يعمل التطبيق، خطوة بخطوة.", "جرّبوه اليوم، الرابط في البايو."],
  pt: ["Todo mundo já passou por isso…", "Veja como o app funciona, passo a passo.", "Teste hoje. O link está na bio."],
  hi: ["हम सबके साथ ऐसा हुआ है…", "देखिए ऐप कैसे काम करता है, स्टेप बाय स्टेप।", "आज ही आज़माइए, लिंक बायो में है।"],
  ko: ["다들 이런 적 있죠…", "앱이 어떻게 작동하는지 하나씩 보여드릴게요.", "오늘 바로 써 보세요. 링크는 프로필에 있어요."],
  zh: ["我们都遇到过这种情况……", "一步一步看看这个应用怎么用。", "今天就试试吧，链接在简介里。"],
};
const genericTranslations: [string, string, string] = [
  "We've all been there…",
  "Watch how the app works, step by step.",
  "Try it today. Link in bio.",
];

/** The hook, then generic beats in the video's language, so the simulated player has captions. */
function buildScript(hook: string, hookTranslation: string, lang: LanguageId, duration: number): ScriptLine[] {
  const translated = isTranslated(lang);
  const [problem, demo, cta] = genericLines[lang];
  const beats: { text: string; en: string; beat: ScriptLine["beat"]; at: number }[] = [
    { text: problem, en: genericTranslations[0], beat: "problem", at: 0.2 },
    { text: demo, en: genericTranslations[1], beat: "demo", at: 0.45 },
    { text: cta, en: genericTranslations[2], beat: "cta", at: 0.8 },
  ];
  let last = 0;
  const lines: ScriptLine[] = [
    { at: 0, text: hook, translation: translated && hookTranslation ? hookTranslation : undefined, beat: "hook" },
  ];
  for (const b of beats) {
    const at = Math.max(last + 1, Math.round(duration * b.at));
    last = at;
    lines.push({ at, text: b.text, translation: translated ? b.en : undefined, beat: b.beat });
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

type Upload = { name: string; size: string; progress: number };

/** A file name for the demo's "Use a sample file" (there's no real file to upload in a prototype). */
const SAMPLE = { name: "app-demo-take-3.mp4", bytes: 48_200_000 };

/**
 * Add a video (simulated upload): choose a file (or a sample one), then the few things brands see
 * first: a title, the opening line and the format. The rest sits behind "More details". Adds the
 * video to the front of the portfolio with `addPortfolioVideo`.
 */
export function AddVideoSheet({ open, onClose, creator }: { open: boolean; onClose: () => void; creator: Creator }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      width="lg"
      title="Add a video"
      description="Upload a finished piece. Brands see the first frame and your opening line before they press play."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <PillButton variant="ghost" onClick={onClose}>
            Cancel
          </PillButton>
          <PillButton type="submit" form="add-video-form" variant="contrast">
            Add to portfolio
          </PillButton>
        </div>
      }
    >
      {open ? <AddVideoForm creator={creator} onClose={onClose} /> : null}
    </Sheet>
  );
}

function AddVideoForm({ creator, onClose }: { creator: Creator; onClose: () => void }) {
  const toast = useToast();
  const firstFormat = creator.formats[0] ?? "app-demo";
  const [form, setForm] = useState<Form>({
    title: "",
    lang: creator.languages[0] ?? "en",
    hook: "",
    hookTranslation: "",
    format: firstFormat,
    duration: String(formatById[firstFormat].typical[0]),
    aspect: "9:16",
    scene: "selfie",
    niche: creator.niches[0] ?? "consumer",
    madeFor: "",
    views: "",
  });
  const [upload, setUpload] = useState<Upload | null>(null);
  const [dragging, setDragging] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [more, setMore] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof Form, boolean>>>({});
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const translated = isTranslated(form.lang);
  const languageName = languageById[form.lang].name;
  const duration = Number(form.duration);
  const views = form.views.trim() ? Number(form.views) : undefined;
  const uploading = upload !== null && upload.progress < 100;
  const errors: Partial<Record<keyof Form | "file", string | null>> = {
    file: !upload ? "Choose the video file first." : uploading ? "Wait for the upload to finish." : null,
    title: form.title.trim().length < 4 ? "Give it a short title (at least 4 characters)." : null,
    hook: form.hook.trim().length < 4 ? "Add the opening line so brands see how it starts." : null,
    duration:
      Number.isInteger(duration) && duration >= 5 && duration <= 600 ? null : "Enter the length in whole seconds, 5 to 600.",
    views: views === undefined || (Number.isInteger(views) && views >= 0) ? null : "Views must be a whole number.",
  };
  const errorCount = Object.values(errors).filter(Boolean).length;
  const show = (field: keyof Form | "file") =>
    attempted || (field !== "file" && touched[field as keyof Form]) ? (errors[field] ?? null) : null;
  const update = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const touch = (field: keyof Form) => setTouched((t) => ({ ...t, [field]: true }));
  const portfolioCount = creator.portfolioIds.length;
  const tints: Video["tints"] = portfolioCount % 2 ? [creator.tints[1], creator.tints[0]] : [creator.tints[0], creator.tints[1]];

  const preview: Video = {
    id: "v-preview",
    creatorId: creator.id,
    title: form.title || "Your new video",
    hook: form.hook || "Your opening line",
    lang: form.lang,
    format: form.format,
    durationSec: Number.isFinite(duration) && duration > 0 ? duration : 30,
    aspect: form.aspect,
    tints,
    scene: form.scene,
    niche: form.niche,
    script: [],
  };

  const startUpload = (name: string, bytes: number) => {
    window.clearInterval(timer.current);
    const mb = bytes / (1024 * 1024);
    setUpload({ name, size: mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`, progress: 0 });
    if (!form.title.trim()) {
      const base = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
      if (base) update({ title: (base[0].toUpperCase() + base.slice(1)).slice(0, 80) });
    }
    let progress = 0;
    timer.current = window.setInterval(() => {
      progress = Math.min(100, progress + 17);
      const value = progress;
      setUpload((u) => (u ? { ...u, progress: value } : u));
      if (value >= 100) window.clearInterval(timer.current);
    }, 150);
  };

  const save = () => {
    setAttempted(true);
    if (errorCount) {
      if (errors.duration || errors.views) setMore(true);
      return;
    }
    actions.addPortfolioVideo(creator.id, {
      title: form.title.trim(),
      hook: form.hook.trim(),
      hookTranslation: translated && form.hookTranslation.trim() ? form.hookTranslation.trim() : undefined,
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
    toast({ message: `“${form.title.trim()}” is first in your portfolio` });
    onClose();
  };

  const fileInput = (
    <input
      type="file"
      accept="video/*"
      className="sr-only"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) startUpload(file.name, file.size);
        event.target.value = "";
      }}
    />
  );

  return (
    <form
      id="add-video-form"
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
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
                {fileInput}
              </label>
            </div>
            <span className="y-progress block" role="progressbar" aria-label="Upload progress" aria-valuenow={upload.progress} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${upload.progress}%` }} />
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label
              className={`y-dropzone flex cursor-pointer flex-col items-center gap-2 px-4 py-7 text-center ${dragging ? "!border-(--b-fg)" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer.files?.[0];
                if (file) startUpload(file.name, file.size);
              }}
            >
              <UploadCloud size={26} aria-hidden />
              <span className="y-small font-semibold">Drop a video here or choose a file</span>
              <span className="y-micro y-fg-2">MP4 or MOV, up to 500 MB. Vertical works best.</span>
              {fileInput}
            </label>
            <button
              type="button"
              className="y-small y-link self-center font-medium"
              onClick={() => startUpload(SAMPLE.name, SAMPLE.bytes)}
            >
              No file handy? Use a sample file
            </button>
          </div>
        )}
        {show("file") ? <p className="y-small px-1 font-medium text-(--y-danger)">{show("file")}</p> : null}
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_168px]">
        <div className="flex flex-col gap-5">
          <TextField
            label="Title"
            name="video-title"
            required
            maxLength={80}
            placeholder="e.g. Roundleaf: 'Where did my paycheck go?'"
            value={form.title}
            onChange={(event) => update({ title: event.target.value })}
            onBlur={() => touch("title")}
            hint="In English. Brands see it under the video."
            error={show("title")}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              label="Language"
              required
              value={form.lang}
              onChange={(event) => update({ lang: event.target.value as LanguageId })}
              options={languages.map((l) => ({ value: l.id, label: l.name }))}
            />
            <SelectField
              label="Format"
              required
              value={form.format}
              onChange={(event) => update({ format: event.target.value as FormatId })}
              options={formats.map((f) => ({ value: f.id, label: f.name }))}
            />
          </div>
          <TextField
            label="Opening line"
            name="video-hook"
            required
            maxLength={90}
            dir={textDir(form.lang)}
            lang={form.lang}
            placeholder={translated ? `As it appears in the video, in ${languageName}` : "I sent the invoice in ten seconds"}
            value={form.hook}
            onChange={(event) => update({ hook: event.target.value })}
            onBlur={() => touch("hook")}
            hint={translated ? `In ${languageName}, as it appears on screen.` : "The first line viewers read on screen."}
            error={show("hook")}
          />
          {translated ? (
            <TextField
              label="Opening line in English"
              maxLength={120}
              placeholder="I sent the invoice in ten seconds"
              value={form.hookTranslation}
              onChange={(event) => update({ hookTranslation: event.target.value })}
              hint={`For brands who don't speak ${languageName}.`}
            />
          ) : null}
        </div>
        <div className="hidden flex-col gap-2 md:flex">
          <p className="y-label">Preview</p>
          <VideoThumb video={preview} decorative />
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <button
          type="button"
          aria-expanded={more}
          onClick={() => setMore((m) => !m)}
          className="y-small flex min-h-11 items-center gap-1.5 self-start font-semibold"
        >
          More details
          <span className="y-fg-2 font-normal">· length, scene, category, results</span>
          <ChevronDown size={16} aria-hidden className={`transition-transform ${more ? "rotate-180" : ""}`} />
        </button>
        {more ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                label="Length in seconds"
                required
                type="number"
                inputMode="numeric"
                min={5}
                max={600}
                value={form.duration}
                onChange={(event) => update({ duration: event.target.value })}
                onBlur={() => touch("duration")}
                error={show("duration")}
              />
              <SelectField
                label="Scene"
                optionalLabel={false}
                value={form.scene}
                onChange={(event) => update({ scene: event.target.value as Scene })}
                options={scenes}
              />
              <SelectField
                label="Category"
                optionalLabel={false}
                value={form.niche}
                onChange={(event) => update({ niche: event.target.value as NicheId })}
                options={niches.map((n) => ({ value: n.id, label: n.name }))}
              />
              <div className="flex flex-col gap-2">
                <p className="y-label">Aspect ratio</p>
                <SegmentedToggle label="Aspect ratio" value={form.aspect} onChange={(aspect) => update({ aspect })} options={aspectOptions} size="md" />
              </div>
              <TextField
                label="Made for"
                maxLength={40}
                placeholder="Brand name, or empty for a spec piece"
                value={form.madeFor}
                onChange={(event) => update({ madeFor: event.target.value })}
              />
              <TextField
                label="Views"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="If the brand shared results"
                value={form.views}
                onChange={(event) => update({ views: event.target.value })}
                onBlur={() => touch("views")}
                error={show("views")}
              />
            </div>
          </>
        ) : null}
      </div>
      {attempted && errorCount ? (
        <p role="alert" className="y-small font-medium text-(--y-danger)">
          Fix {errorCount === 1 ? "1 thing" : `${errorCount} things`} to add this video.
        </p>
      ) : null}
    </form>
  );
}
