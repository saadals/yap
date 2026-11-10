/**
 * Simulated file checks (no real uploads). The new-order form runs `checkBriefAttachments` on what
 * the brand drops in; the delivery sheet runs `checkCopyDocument` on an ad-copy document. Each
 * returns what was accepted and, separately, plain messages for what wasn't (Work spec 6.11.7:
 * rejections are shown together, the rest are still added).
 */

import { AD_COPY_DOCUMENT_TYPES, BRIEF_ATTACHMENT_LIMITS } from "./taxonomy";
import type { BriefAttachment } from "./types";

/** "6.2 MB", "340 KB". */
export function bytesLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** "docx" from "Brand guide.DOCX". */
export const extensionOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

/** "Video · 18 s · 6.2 MB", "Document · 1.1 MB". */
export function attachmentMeta(file: Pick<BriefAttachment, "kind" | "bytes" | "durationSec">): string {
  const kind = file.kind === "video" ? "Video" : file.kind === "image" ? "Image" : "Document";
  const length = file.kind === "video" && file.durationSec !== undefined ? ` · ${Math.round(file.durationSec)} s` : "";
  return `${kind}${length} · ${bytesLabel(file.bytes)}`;
}

/** What a picked file looks like before it's checked (from an <input type=file> or a sample). */
export type IncomingFile = { name: string; bytes: number; kind?: BriefAttachment["kind"]; durationSec?: number };

/** The kind a file name suggests, when the caller doesn't say. */
export function kindFromName(name: string): BriefAttachment["kind"] | undefined {
  const ext = extensionOf(name);
  if ((BRIEF_ATTACHMENT_LIMITS.documentTypes as readonly string[]).includes(ext)) return "document";
  if (["mp4", "mov", "m4v", "webm"].includes(ext)) return "video";
  if (["png", "jpg", "jpeg", "gif", "webp", "heic"].includes(ext)) return "image";
  return undefined;
}

/**
 * Add `incoming` to `existing` within the limits: each file at most 10 MB, one reference video of at
 * most 20 seconds, up to ten images, documents as PDF, DOC, DOCX, TXT or MD. Returns the full new
 * list (existing first) and one message per rejection.
 */
export function checkBriefAttachments(
  existing: BriefAttachment[],
  incoming: IncomingFile[],
  makeId: (index: number) => string = (index) => `att-${existing.length + index + 1}`,
): { files: BriefAttachment[]; rejected: string[] } {
  const L = BRIEF_ATTACHMENT_LIMITS;
  const files = [...existing];
  const rejected: string[] = [];
  incoming.forEach((file, index) => {
    const kind = file.kind ?? kindFromName(file.name);
    if (!kind) {
      rejected.push(`${file.name}: use PDF, DOC or TXT`);
      return;
    }
    if (file.bytes > L.maxBytes) {
      rejected.push(`${file.name} is over 10 MB`);
      return;
    }
    if (kind === "document" && !(L.documentTypes as readonly string[]).includes(extensionOf(file.name))) {
      rejected.push(`${file.name}: use PDF, DOC or TXT`);
      return;
    }
    if (kind === "image" && files.filter((f) => f.kind === "image").length >= L.maxImages) {
      rejected.push(`Up to ${L.maxImages} images`);
      return;
    }
    if (kind === "video") {
      if (files.some((f) => f.kind === "video")) {
        rejected.push("One reference video only");
        return;
      }
      if ((file.durationSec ?? 0) > L.maxVideoSec + L.videoSlackSec) {
        rejected.push(`${file.name} is ${Math.round(file.durationSec ?? 0)} s · max ${L.maxVideoSec} seconds`);
        return;
      }
    }
    files.push({
      id: makeId(index),
      kind,
      name: file.name,
      bytes: file.bytes,
      ...(kind === "video" && file.durationSec !== undefined ? { durationSec: file.durationSec } : {}),
    });
  });
  // One message per kind of rejection is enough for the image and video caps.
  return { files, rejected: [...new Set(rejected)] };
}

/** Counter under the list: "3/10 images · 1/1 video". */
export function attachmentCounter(files: BriefAttachment[]): string {
  const L = BRIEF_ATTACHMENT_LIMITS;
  const images = files.filter((f) => f.kind === "image").length;
  const videos = files.filter((f) => f.kind === "video").length;
  return `${images}/${L.maxImages} images · ${videos}/${L.maxVideos} video`;
}

/** An ad-copy delivery document must be PDF, DOC, DOCX or TXT, at most 10 MB. Null when it's fine. */
export function checkCopyDocument(file: { name: string; bytes: number }): string | null {
  if (!(AD_COPY_DOCUMENT_TYPES as readonly string[]).includes(extensionOf(file.name)))
    return `${file.name}: use PDF, DOC, DOCX or TXT`;
  if (file.bytes > BRIEF_ATTACHMENT_LIMITS.maxBytes) return `${file.name} is over 10 MB`;
  return null;
}
