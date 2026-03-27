/** Shared types for admin menu management components */

export interface ModifierOptionRef {
  id: string;
  name: string;
  nameEl: string | null;
  priceAdjustment: number;
}

export interface ModifierGroupRef {
  id: string;
  name: string;
  options: ModifierOptionRef[];
}
