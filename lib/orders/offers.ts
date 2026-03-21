export const OFFER_TYPE_BOGO = "BOGO" as const;

export type OfferType = typeof OFFER_TYPE_BOGO;

interface OfferableProduct {
  offerType?: string | null;
  offerPrice?: number | null;
  offerStart?: string | Date | null;
  offerEnd?: string | Date | null;
}

export function hasActiveOffer(product: OfferableProduct): boolean {
  if (product.offerType !== OFFER_TYPE_BOGO || product.offerPrice == null) return false;
  const now = new Date();
  if (product.offerStart && new Date(product.offerStart) > now) return false;
  if (product.offerEnd && new Date(product.offerEnd) < now) return false;
  return true;
}

export function calcBogoTotal(
  quantity: number,
  offerPrice: number,
  basePrice: number,
  modifierTotal: number
): number {
  const pairs = Math.floor(quantity / 2);
  const remainder = quantity % 2;
  return (
    pairs * (offerPrice + modifierTotal * 2) +
    remainder * (basePrice + modifierTotal)
  );
}
