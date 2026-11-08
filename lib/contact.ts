/**
 * In-platform only (PM spec): no external contact method is ever exposed. Text that people type
 * (messages, pitches, offer and hire notes) goes through `maskContacts` before it's stored, so
 * emails, phone numbers, links and social handles never reach the other side.
 *
 * `allow` lets specific handles through, e.g. the brand account a campaign asks creators to tag.
 */

export const HIDDEN = "[contact hidden]";

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const LINK =
  /\b(?:https?:\/\/|www\.)\S+|\b(?:wa\.me|t\.me|api\.whatsapp\.com|instagram\.com|tiktok\.com|snapchat\.com|x\.com|twitter\.com|facebook\.com|fb\.com|linkedin\.com|youtube\.com|youtu\.be)\/\S*/gi;
/** Digits in Latin, Arabic-Indic and Eastern Arabic (Persian) forms. */
const D = "0-9٠-٩۰-۹";
const PHONE = new RegExp(`(?:\\+|00)?[${D}](?:[${D}\\s().-]){6,}[${D}]`, "g");
const HANDLE = /(^|[^\w@./])@([A-Za-z0-9_.]{3,30})/g;

const digitCount = (value: string) => (value.match(new RegExp(`[${D}]`, "g")) ?? []).length;

export type MaskResult = { text: string; hidden: number };

export function maskContacts(input: string, allow: string[] = []): MaskResult {
  const allowed = new Set(allow.map((h) => h.replace(/^@/, "").toLowerCase()));
  let hidden = 0;
  let text = input.replace(EMAIL, () => {
    hidden += 1;
    return HIDDEN;
  });
  text = text.replace(LINK, () => {
    hidden += 1;
    return HIDDEN;
  });
  text = text.replace(PHONE, (match) => {
    const digits = digitCount(match);
    const prefixed = /^(?:\+|00)/.test(match.trim());
    if (digits >= 9 || (prefixed && digits >= 8)) {
      hidden += 1;
      return HIDDEN;
    }
    return match;
  });
  text = text.replace(HANDLE, (match, lead: string, handle: string) => {
    if (allowed.has(handle.toLowerCase())) return match;
    hidden += 1;
    return `${lead}${HIDDEN}`;
  });
  return { text, hidden };
}

/** True when `maskContacts` would hide something (for a composer notice before sending). */
export const hasContactDetails = (text: string, allow: string[] = []) =>
  maskContacts(text, allow).hidden > 0;
