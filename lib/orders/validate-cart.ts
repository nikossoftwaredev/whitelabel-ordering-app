import { prisma } from "@/lib/db";
import { calcBogoTotal, hasActiveOffer } from "@/lib/orders/offers";

interface CartItemModifier {
  modifierOptionId: string;
}

interface CartItem {
  productId: string;
  quantity: number;
  modifiers?: CartItemModifier[];
  notes?: string;
}

interface ValidatedItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  modifiers: {
    modifierOptionId: string;
    name: string;
    priceAdjustment: number;
  }[];
  totalPrice: number;
}

interface ValidationResult {
  valid: boolean;
  items: ValidatedItem[];
  subtotal: number;
  errors: string[];
}

export async function validateCart(
  tenantId: string,
  cartItems: CartItem[]
): Promise<ValidationResult> {
  const errors: string[] = [];
  const validatedItems: ValidatedItem[] = [];

  if (!cartItems?.length) {
    return { valid: false, items: [], subtotal: 0, errors: ["Cart is empty"] };
  }

  // Batch-fetch all products in a single query (fixes N+1)
  const productIds = cartItems.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, tenantId, isActive: true },
    include: {
      modifierGroups: {
        include: {
          modifierGroup: {
            include: { options: { where: { isActive: true } } },
          },
        },
      },
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of cartItems) {
    const product = productMap.get(item.productId);

    if (!product) {
      errors.push(`Product ${item.productId} not found or inactive`);
      continue;
    }

    if (item.quantity < 1) {
      errors.push(`Invalid quantity for ${product.name}`);
      continue;
    }

    // Validate modifiers
    const validatedModifiers: ValidatedItem["modifiers"] = [];
    let modifierTotal = 0;

    for (const pmg of product.modifierGroups) {
      const group = pmg.modifierGroup;
      const selectedForGroup = (item.modifiers || []).filter((m) =>
        group.options.some((o) => o.id === m.modifierOptionId)
      );

      if (group.required && selectedForGroup.length < group.minSelect) {
        errors.push(
          `${product.name}: ${group.name} requires at least ${group.minSelect} selection(s)`
        );
      }

      if (selectedForGroup.length > group.maxSelect) {
        errors.push(
          `${product.name}: ${group.name} allows at most ${group.maxSelect} selection(s)`
        );
      }

      for (const sel of selectedForGroup) {
        const option = group.options.find(
          (o) => o.id === sel.modifierOptionId
        );
        if (option) {
          validatedModifiers.push({
            modifierOptionId: option.id,
            name: option.name,
            priceAdjustment: option.priceAdjustment,
          });
          modifierTotal += option.priceAdjustment;
        }
      }
    }

    const isBogoActive = hasActiveOffer(product);

    let totalPrice: number;
    let unitPrice: number;

    if (isBogoActive && item.quantity >= 2) {
      unitPrice = product.offerPrice!;
      totalPrice = calcBogoTotal(item.quantity, product.offerPrice!, product.price, modifierTotal);
    } else {
      unitPrice = product.price;
      totalPrice = (product.price + modifierTotal) * item.quantity;
    }

    validatedItems.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPrice,
      modifiers: validatedModifiers,
      totalPrice,
    });
  }

  const subtotal = validatedItems.reduce((sum, item) => sum + item.totalPrice, 0);

  return {
    valid: errors.length === 0,
    items: validatedItems,
    subtotal,
    errors,
  };
}
