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
};

export const countries: Country[] = [
  { id: "sa", name: "Saudi Arabia", dial: "+966", lengths: [9], groups: [2, 3, 4] },
  { id: "ae", name: "United Arab Emirates", dial: "+971", lengths: [9], groups: [2, 3, 4] },
  { id: "kw", name: "Kuwait", dial: "+965", lengths: [8], groups: [4, 4] },
  { id: "qa", name: "Qatar", dial: "+974", lengths: [8], groups: [4, 4] },
  { id: "bh", name: "Bahrain", dial: "+973", lengths: [8], groups: [4, 4] },
  { id: "om", name: "Oman", dial: "+968", lengths: [8], groups: [4, 4] },
  { id: "iq", name: "Iraq", dial: "+964", lengths: [10], groups: [3, 3, 4] },
  { id: "jo", name: "Jordan", dial: "+962", lengths: [9], groups: [1, 4, 4] },
  { id: "lb", name: "Lebanon", dial: "+961", lengths: [7, 8], groups: [2, 3, 3] },
  { id: "eg", name: "Egypt", dial: "+20", lengths: [10], groups: [3, 3, 4] },
  { id: "ma", name: "Morocco", dial: "+212", lengths: [9], groups: [3, 3, 3] },
  { id: "us", name: "United States", dial: "+1", lengths: [10], groups: [3, 3, 4] },
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

const national = (value: string, country: Country) => typedDigits(value, country).replace(/^0/, "");

export function isPlausible(value: string, country: Country): boolean {
  return country.lengths.includes(national(value, country).length);
}

/** Groups the number as it's typed ("050 123 4567"), keeping a trunk 0 people expect to see. */
export function formatPhone(value: string, country: Country): string {
  const typed = typedDigits(value, country);
  const trunk = typed.startsWith("0") ? "0" : "";
  const rest = typed.slice(trunk.length).slice(0, Math.max(...country.lengths));
  const parts: string[] = [];
  let at = 0;
  for (const size of country.groups) {
    if (at >= rest.length) break;
    parts.push(rest.slice(at, at + size));
    at += size;
  }
  return `${trunk}${parts.join(" ")}`;
}

/** "+966 50 123 4567". */
export function fullNumber(value: string, country: Country): string {
  return `${country.dial} ${formatPhone(national(value, country), country)}`;
}

/** "+966 ••• ••• 4567": what the saved-accounts list shows. */
export function maskedNumber(value: string, country: Country): string {
  return `${country.dial} ••• ••• ${national(value, country).slice(-4)}`;
}
