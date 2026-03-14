import { PrismaClient } from "@prisma/client";
import { coffeeShopPreset } from "./coffee-shop";
import { souvlakiShopPreset } from "./souvlaki-shop";

export const presets = {
  "coffee-shop": coffeeShopPreset,
  "souvlaki-shop": souvlakiShopPreset,
} as const;

export type PresetKey = keyof typeof presets;

interface PresetProduct {
  name: string;
  nameEl?: string;
  price: number;
  description?: string;
  isVegan?: boolean;
  isVegetarian?: boolean;
  isGlutenFree?: boolean;
  isDairyFree?: boolean;
  containsNuts?: boolean;
  isSpicy?: boolean;
}

interface PresetOption {
  name: string;
  nameEl?: string;
  priceAdjustment: number;
  isDefault?: boolean;
}

interface PresetModifierGroup {
  name: string;
  nameEl?: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  applyTo: string[];
  options: PresetOption[];
}

interface PresetCategory {
  name: string;
  nameEl?: string;
  products: PresetProduct[];
}

interface Preset {
  categories: PresetCategory[];
  modifierGroups: PresetModifierGroup[];
}

export async function applyPreset(
  prisma: PrismaClient,
  tenantId: string,
  preset: Preset
) {
  // Create modifier groups first
  const groupMap = new Map<string, string>(); // name -> id
  const categoryMap = new Map<string, string>(); // name -> id

  for (const [i, group] of preset.modifierGroups.entries()) {
    const created = await prisma.modifierGroup.create({
      data: {
        tenantId,
        name: group.name,
        nameEl: group.nameEl,
        required: group.required,
        minSelect: group.minSelect,
        maxSelect: group.maxSelect,
        sortOrder: i,
        options: {
          create: group.options.map((opt, j) => ({
            name: opt.name,
            nameEl: opt.nameEl,
            priceAdjustment: opt.priceAdjustment,
            isDefault: opt.isDefault ?? false,
            sortOrder: j,
          })),
        },
      },
    });
    groupMap.set(group.name, created.id);
  }

  // Create categories and products
  for (const [i, cat] of preset.categories.entries()) {
    const category = await prisma.category.create({
      data: {
        tenantId,
        name: cat.name,
        nameEl: cat.nameEl,
        sortOrder: i,
      },
    });
    categoryMap.set(cat.name, category.id);

    for (const [j, prod] of cat.products.entries()) {
      // Find modifier groups that apply to this category
      const applicableGroups = preset.modifierGroups.filter((g) =>
        g.applyTo.includes(cat.name)
      );

      await prisma.product.create({
        data: {
          tenantId,
          categoryId: category.id,
          name: prod.name,
          nameEl: prod.nameEl,
          price: prod.price,
          description: prod.description,
          sortOrder: j,
          isVegan: prod.isVegan ?? false,
          isVegetarian: prod.isVegetarian ?? false,
          isGlutenFree: prod.isGlutenFree ?? false,
          isDairyFree: prod.isDairyFree ?? false,
          containsNuts: prod.containsNuts ?? false,
          isSpicy: prod.isSpicy ?? false,
          ...(applicableGroups.length && {
            modifierGroups: {
              create: applicableGroups.map((g, k) => ({
                modifierGroupId: groupMap.get(g.name)!,
                sortOrder: k,
              })),
            },
          }),
        },
      });
    }
  }
}
