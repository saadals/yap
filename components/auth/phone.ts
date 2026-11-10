/**
 * Phone numbers for sign-in, without a formatting library: enough to check a number is plausible
 * and print it nicely. Real validation (E.164, carrier checks) belongs to the SMS provider.
 *
 * `lengths` and `groups` describe the national number without its leading trunk 0.
 */

import { toLatinDigits } from "@/lib/format";

export type Country = {
  id: string;
  name: string;
  dial: string;
  lengths: number[];
  groups: number[];
  /** Domestic prefix people may type before the national number ("0" in most places, "1" on +1). */
  trunk?: string;
};

/** +1 first (the default), then A to Z. */
export const countries: Country[] = [
  { id: "us", name: "United States and Canada", dial: "+1", lengths: [10], groups: [3, 3, 4], trunk: "1" },
  { id: "dz", name: "Algeria", dial: "+213", lengths: [9], groups: [3, 2, 2, 2] },
  { id: "au", name: "Australia", dial: "+61", lengths: [9], groups: [3, 3, 3] },
  { id: "bh", name: "Bahrain", dial: "+973", lengths: [8], groups: [4, 4] },
  { id: "br", name: "Brazil", dial: "+55", lengths: [10, 11], groups: [2, 5, 4] },
  { id: "cn", name: "China", dial: "+86", lengths: [11], groups: [3, 4, 4] },
  { id: "eg", name: "Egypt", dial: "+20", lengths: [10], groups: [3, 3, 4] },
  { id: "fr", name: "France", dial: "+33", lengths: [9], groups: [1, 2, 2, 2, 2] },
  { id: "de", name: "Germany", dial: "+49", lengths: [10, 11], groups: [3, 4, 4] },
  { id: "in", name: "India", dial: "+91", lengths: [10], groups: [5, 5] },
  { id: "iq", name: "Iraq", dial: "+964", lengths: [10], groups: [3, 3, 4] },
  { id: "ie", name: "Ireland", dial: "+353", lengths: [9], groups: [2, 3, 4] },
  { id: "jp", name: "Japan", dial: "+81", lengths: [10], groups: [2, 4, 4] },
  { id: "jo", name: "Jordan", dial: "+962", lengths: [9], groups: [1, 4, 4] },
  { id: "kw", name: "Kuwait", dial: "+965", lengths: [8], groups: [4, 4] },
  { id: "lb", name: "Lebanon", dial: "+961", lengths: [7, 8], groups: [2, 3, 3] },
  { id: "mx", name: "Mexico", dial: "+52", lengths: [10], groups: [3, 3, 4] },
  { id: "ma", name: "Morocco", dial: "+212", lengths: [9], groups: [3, 3, 3] },
  { id: "ng", name: "Nigeria", dial: "+234", lengths: [10], groups: [3, 3, 4] },
  { id: "om", name: "Oman", dial: "+968", lengths: [8], groups: [4, 4] },
  { id: "pk", name: "Pakistan", dial: "+92", lengths: [10], groups: [3, 7] },
  { id: "ph", name: "Philippines", dial: "+63", lengths: [10], groups: [3, 3, 4] },
  { id: "qa", name: "Qatar", dial: "+974", lengths: [8], groups: [4, 4] },
  { id: "sa", name: "Saudi Arabia", dial: "+966", lengths: [9], groups: [2, 3, 4] },
  { id: "sg", name: "Singapore", dial: "+65", lengths: [8], groups: [4, 4] },
  { id: "za", name: "South Africa", dial: "+27", lengths: [9], groups: [2, 3, 4] },
  { id: "kr", name: "South Korea", dial: "+82", lengths: [9, 10], groups: [2, 4, 4] },
  { id: "es", name: "Spain", dial: "+34", lengths: [9], groups: [3, 3, 3] },
  { id: "tn", name: "Tunisia", dial: "+216", lengths: [8], groups: [2, 3, 3] },
  { id: "tr", name: "Turkey", dial: "+90", lengths: [10], groups: [3, 3, 4] },
  { id: "ae", name: "United Arab Emirates", dial: "+971", lengths: [9], groups: [2, 3, 4] },
  { id: "gb", name: "United Kingdom", dial: "+44", lengths: [10], groups: [4, 3, 3] },
];

export const defaultCountry = countries[0];

export const countryById = (id: string): Country =>
  countries.find((country) => country.id === id) ?? defaultCountry;

/** The digits typed, minus an international prefix that autofill or the person included. */
function typedDigits(value: string, country: Country): string {
  const latin = toLatinDigits(value).trim();
  const digits = latin.replace(/\D/g, "");
  const code = country.dial.slice(1);
  if (latin.startsWith("+") && digits.startsWith(code)) return digits.slice(code.length);
  if (digits.startsWith(`00${code}`)) return digits.slice(code.length + 2);
  return digits;
}

const trunkOf = (country: Country) => country.trunk ?? "0";

/**
 * The national number: digits typed, minus the trunk prefix. National numbers never start with
 * their trunk digit (a +1 area code never starts with 1), so a leading one is always the prefix.
 */
function national(value: string, country: Country): string {
  const digits = typedDigits(value, country);
  const trunk = trunkOf(country);
  return digits.startsWith(trunk) ? digits.slice(trunk.length) : digits;
}

export function isPlausible(value: string, country: Country): boolean {
  return country.lengths.includes(national(value, country).length);
}

/** Groups the number as it's typed ("415 555 0123"), keeping a trunk prefix people expect to see. */
export function formatPhone(value: string, country: Country): string {
  const typed = typedDigits(value, country);
  const prefix = trunkOf(country);
  const trunk = typed.startsWith(prefix) ? prefix : "";
  const rest = typed.slice(trunk.length).slice(0, Math.max(...country.lengths));
  const parts: string[] = [];
  let at = 0;
  for (const size of country.groups) {
    if (at >= rest.length) break;
    parts.push(rest.slice(at, at + size));
    at += size;
  }
  // "050 123 4567", but "1 415 555 0123".
  const gap = trunk && trunk !== "0" && parts.length ? " " : "";
  return `${trunk}${gap}${parts.join(" ")}`;
}

/** "+1 415 555 0123". */
export function fullNumber(value: string, country: Country): string {
  return `${country.dial} ${formatPhone(national(value, country), country)}`;
}

/** "+1 ••• ••• 0123": what the saved-accounts list shows. */
export function maskedNumber(value: string, country: Country): string {
  return `${country.dial} ••• ••• ${national(value, country).slice(-4)}`;
}
