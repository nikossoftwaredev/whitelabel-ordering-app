/**
 * Pure function for calculating the best group discount.
 * Used both server-side (order creation) and client-side (checkout preview).
 * Must NOT import any server-only modules.
 */

export interface GroupDiscountInput {
  id: string;
  name: string;
  discountType: "FIXED" | "PERCENTAGE" | null;
  discountValue: number | null;
  minOrder: number | null;
  maxDiscount: number | null;
  discountEnabled: boolean;
}

export interface GroupDiscountResult {
  groupId: string;
  groupName: string;
  discountType: "FIXED" | "PERCENTAGE";
  discountValue: number;
  discount: number; // calculated amount in cents
}

export function calculateBestGroupDiscount(
  groups: GroupDiscountInput[],
  subtotal: number,
): GroupDiscountResult | null {
  let best: GroupDiscountResult | null = null;

  for (const group of groups) {
    if (!group.discountEnabled || !group.discountType || !group.discountValue || group.discountValue <= 0) {
      continue;
    }

    if (group.minOrder && subtotal < group.minOrder) {
      continue;
    }

    let discount: number;
    if (group.discountType === "FIXED") {
      discount = Math.min(group.discountValue, subtotal);
    } else {
      discount = Math.round((subtotal * group.discountValue) / 100);
      if (group.maxDiscount && discount > group.maxDiscount) {
        discount = group.maxDiscount;
      }
      discount = Math.min(discount, subtotal);
    }

    if (discount > 0 && (!best || discount > best.discount)) {
      best = {
        groupId: group.id,
        groupName: group.name,
        discountType: group.discountType,
        discountValue: group.discountValue,
        discount,
      };
    }
  }

  return best;
}
