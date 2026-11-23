// Indian mobile numbers as guests type them; shared by server pages and client forms.

/** "98450 12345", "+91 98450-12345", "098450 12345" → "+919845012345"; null if not an Indian mobile. */
export function toMobile(typed: string): string | null {
  const digits = typed.replace(/[\s()-]/g, "").replace(/^(?:\+91|0091|91(?=\d{10}$)|0)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

/** "+919845012345" → "+91 98450 •••45": enough for a guest to recognise their number. */
export function maskMobile(e164: string): string {
  return e164.length === 13 ? `+91 ${e164.slice(3, 8)} •••${e164.slice(-2)}` : e164;
}
