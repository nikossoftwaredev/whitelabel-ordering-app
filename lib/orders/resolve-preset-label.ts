/**
 * Resolve the locale-appropriate preset label for a product.
 * Falls back to the English name, then to the provided fallback string.
 */
export function resolvePresetLabel(
  product: { presetName?: string | null; presetNameEl?: string | null },
  locale: string,
  fallback: string,
): string {
  const localized = locale === "el" ? product.presetNameEl : product.presetName;
  return localized || product.presetName || fallback;
}
