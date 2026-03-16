/**
 * Shared formatting utilities used across admin and customer-facing components.
 */

/** Map of currency code → Intl locale + symbol for consistent formatting */
const CURRENCY_CONFIG: Record<string, { locale: string; currency: string }> = {
  EUR: { locale: "de-DE", currency: "EUR" },
  USD: { locale: "en-US", currency: "USD" },
  GBP: { locale: "en-GB", currency: "GBP" },
};

function getCurrencyFormatter(currency: string) {
  const config = CURRENCY_CONFIG[currency] ?? {
    locale: "en-US",
    currency,
  };
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
    minimumFractionDigits: 2,
  });
}

/** Format a price stored in cents → "€1.50" (defaults to EUR for backwards compat) */
export const formatPrice = (cents: number, currency = "EUR"): string =>
  getCurrencyFormatter(currency).format(cents / 100);

/** Format an amount already in major units (not cents) → "€12.50" */
export const formatAmount = (amount: number, currency = "EUR"): string =>
  getCurrencyFormatter(currency).format(amount);

/** Convert cents to decimal string without symbol → "1.50" (for input fields) */
export const centsToDecimal = (cents: number): string =>
  (cents / 100).toFixed(2);

/** @deprecated Use centsToDecimal instead */
export const centsToEuros = centsToDecimal;

/** Convert decimal string to cents → 150 (for form parsing) */
export const decimalToCents = (value: string): number =>
  Math.round(parseFloat(value || "0") * 100);

/** @deprecated Use decimalToCents instead */
export const eurosToCents = decimalToCents;

/** Format a date string with time → "Mar 16, 2026, 02:30 PM" */
export const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Format a date string without time → "16/03/2026" */
export const formatDateShort = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

/** Format invoice number → "A-0001" */
export const formatInvoiceNumber = (series: string, seq: number): string =>
  `${series}-${String(seq).padStart(4, "0")}`;

/** Relative time ago string → "5m ago", "2h ago", "3d ago" */
export const timeAgo = (dateStr: string): string => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};
