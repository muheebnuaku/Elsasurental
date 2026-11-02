import { site } from "@/lib/site";

export function formatMoney(amount: number, currency: string = site.defaultCurrency) {
  return new Intl.NumberFormat(site.locale, {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatHours(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** wa.me link with an optional prefilled message. Pass the live number (getBusiness / useBusiness). */
export function whatsappLink(message?: string, to: string = site.whatsapp) {
  const number = to.replace(/[^0-9]/g, "");
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

export function telLink(phone: string = site.phone) {
  return `tel:${phone.replace(/\s/g, "")}`;
}

/** "Sat 14 Nov, 06:00" in Accra time. */
export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Accra",
  }).format(new Date(iso));
}
