import { prisma } from "@/lib/db";

export async function generateOrderNumber(tenantId: string): Promise<string> {
  const today = new Date();

  // Count today's orders for this tenant
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const count = await prisma.order.count({
    where: {
      tenantId,
      createdAt: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
  });

  const letter = String.fromCharCode(65 + (count % 26)); // A-Z
  const num = String(Math.floor(count / 26) * 26 + count + 1).padStart(3, "0");

  return `#${letter}${num}`;
}
