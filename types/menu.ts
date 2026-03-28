export interface ModifierOption {
  id: string;
  name: string;
  nameEl: string | null;
  priceAdjustment: number;
  isDefault: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  nameEl: string | null;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  freeCount?: number;
  options: ModifierOption[];
}

export interface MenuItem {
  id: string;
  name: string;
  nameEl: string | null;
  description: string | null;
  descriptionEl?: string | null;
  image: string | null;
  price: number;
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  containsNuts: boolean;
  isSpicy: boolean;
  allergens: string | null;
  modifierGroups: ModifierGroup[];
  hasPreset?: boolean;
  presetOptionIds?: string[];
  presetName?: string | null;
  presetNameEl?: string | null;
  offerType?: string | null;
  offerPrice?: number | null;
  offerStart?: string | null;
  offerEnd?: string | null;
}

export interface MenuCategory {
  id: string;
  name: string;
  nameEl: string | null;
  products: MenuItem[];
}

export interface OperatingHour {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface MenuData {
  tenant: {
    name: string;
    isPaused: boolean;
    currency: string;
    logo: string | null;
    coverImage?: string | null;
    description: string | null;
    prepTimeMinutes?: number;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    operatingHours?: OperatingHour[];
  };
  categories: MenuCategory[];
  popularProductIds?: string[];
}
