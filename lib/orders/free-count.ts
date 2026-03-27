interface ModifierWithPrice {
  modifierOptionId: string;
  name: string;
  priceAdjustment: number;
}

/**
 * Apply free-count logic to a list of selected modifiers for a single group.
 * The N most expensive paid options become free (priceAdjustment set to 0).
 * Options already at 0 are untouched and don't consume free slots.
 */
export function applyFreeCount(
  modifiers: ModifierWithPrice[],
  freeCount: number
): ModifierWithPrice[] {
  if (freeCount <= 0) return modifiers;

  const paid = modifiers
    .filter((m) => m.priceAdjustment > 0)
    .sort((a, b) => b.priceAdjustment - a.priceAdjustment);

  const freeIds = new Set(
    paid.slice(0, freeCount).map((m) => m.modifierOptionId)
  );

  return modifiers.map((m) =>
    freeIds.has(m.modifierOptionId)
      ? { ...m, priceAdjustment: 0 }
      : m
  );
}
