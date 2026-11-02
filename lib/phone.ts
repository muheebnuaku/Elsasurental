// Ghana phone numbers. Everything is stored as E.164: +233XXXXXXXXX.
// Mobile numbers start with 2 or 5 after the country code (MTN, Telecel, AirtelTigo).

const GH_MOBILE = /^\+233[25]\d{8}$/;

/** Accepts 024 123 4567, 0241234567, 233241234567, +233 24 123 4567 … → "+233241234567" (or null). */
export function normalizeGhanaPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let n: string;
  if (digits.startsWith("+233")) n = digits;
  else if (digits.startsWith("00233")) n = `+${digits.slice(2)}`;
  else if (digits.startsWith("233")) n = `+${digits}`;
  else if (digits.startsWith("0")) n = `+233${digits.slice(1)}`;
  else if (/^[25]\d{8}$/.test(digits)) n = `+233${digits}`;
  else return null;
  return GH_MOBILE.test(n) ? n : null;
}

/** "+233241234567" → "024 123 4567" for display. */
export function formatGhanaPhone(e164: string): string {
  const m = e164.match(/^\+233(\d{2})(\d{3})(\d{4})$/);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : e164;
}
