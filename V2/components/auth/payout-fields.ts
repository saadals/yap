/**
 * Payout account checks for onboarding's "Get paid" step (copied from V1's money/payout-methods,
 * which lives with Earnings in V2). Simulated: real checks belong to the payment provider.
 */

/** Letters and digits only, upper case ("12-345 678" → "12345678"). */
const compact = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Works for a US or Canadian account number and for an IBAN; an IBAN also gets its checksum checked. */
export function accountNumberError(raw: string): string | null {
  const value = compact(raw);
  if (!value) return "Enter your account number.";
  if (value.length < 4 || value.length > 34) return "That doesn't look like an account number. Check it in your banking app.";
  if (/^[A-Z]{2}\d{2}/.test(value) && value.length >= 15) {
    // ISO 13616: rearrange, letters become numbers, mod 97 must equal 1.
    const rearranged = value.slice(4) + value.slice(0, 4);
    let remainder = 0;
    for (const char of rearranged) {
      const digits = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
      for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
    }
    if (remainder !== 1) return "That IBAN doesn't check out. Copy it again from your banking app.";
  } else if (!/^\d+$/.test(value)) {
    return "Account numbers are digits only. If yours starts with two letters, enter the whole IBAN.";
  }
  return null;
}

/** Routing number (US) or transit and institution numbers (Canada); optional, an IBAN needs none. */
export function bankCodeError(raw: string): string | null {
  const value = compact(raw);
  if (!value) return null;
  return value.length >= 5 && value.length <= 11
    ? null
    : "Check the number: a US routing number has 9 digits, Canadian transit and institution numbers 8 together.";
}

export const ACCOUNT_HINT = "Your account number, or an IBAN outside North America. Spaces are fine.";
export const BANK_CODE_HINT =
  "For US and Canadian accounts (in Canada, transit and institution numbers together). Leave it empty if you entered an IBAN.";
