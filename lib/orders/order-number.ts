import { prisma } from "@/lib/db";

export async function generateOrderNumber(tenantId: string, attempt = 0): Promise<string> {
  // Count ALL orders for this tenant (not just today's).
  // Using a daily count caused P2002 collisions: the first order of every new day
  // would generate #A001, colliding with the first order from any previous day.
  const count = await prisma.order.count({
    where: { tenantId },
  });

  const effectiveCount = count + attempt;
  const letter = String.fromCharCode(65 + (effectiveCount % 26)); // A-Z cycling
  const num = String(effectiveCount + 1).padStart(3, "0");

  return `#${letter}${num}`;
}
