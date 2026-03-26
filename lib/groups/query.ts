import { prisma } from "@/lib/db";

/**
 * Fetch customer groups with active discounts that the given customer belongs to.
 * Used by both the coupons endpoint and orders endpoint.
 */
export function findEligibleGroupDiscounts(tenantId: string, customerId: string) {
  return prisma.customerGroup.findMany({
    where: {
      tenantId,
      discountEnabled: true,
      discountType: { not: null },
      discountValue: { not: null, gt: 0 },
      members: { some: { customerId } },
    },
  });
}
