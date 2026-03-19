import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";

// ─── Domain helpers ─────────────────────────────────────────

/** Normalize raw domain strings: lowercase, trim, strip empties */
export function normalizeDomains(domains: string[]): string[] {
  return domains.map((d) => d.toLowerCase().trim()).filter(Boolean);
}

/** Build domain create records from a normalized list */
export function buildDomainRecords(
  domains: string[],
  tenantId?: string
) {
  return domains.map((d, i) => ({
    ...(tenantId && { tenantId }),
    domain: d,
    isPrimary: i === 0,
  }));
}

/** Check if any domains conflict with other tenants */
export async function checkDomainConflicts(
  domains: string[],
  excludeTenantId: string
): Promise<string | null> {
  if (domains.length === 0) return null;
  const conflicts = await prisma.tenantDomain.findMany({
    where: {
      domain: { in: domains },
      tenantId: { not: excludeTenantId },
    },
  });
  return conflicts.length > 0 ? conflicts[0].domain : null;
}

/** Sync tenant domains: delete-all then bulk-insert in a transaction */
export async function syncTenantDomains(tenantId: string, domains: string[]) {
  const normalized = normalizeDomains(domains);
  const records = normalized.map((d, i) => ({
    tenantId,
    domain: d,
    isPrimary: i === 0,
  }));
  await prisma.$transaction([
    prisma.tenantDomain.deleteMany({ where: { tenantId } }),
    ...(records.length > 0
      ? [prisma.tenantDomain.createMany({ data: records })]
      : []),
  ]);
}

// ─── Owner role helpers ─────────────────────────────────────

/** Flatten ownerEmail from tenantRoles query result */
export function flattenOwnerEmail(
  tenantRoles: { user: { email: string } }[]
): string | null {
  return tenantRoles[0]?.user?.email ?? null;
}

/**
 * Assign an OWNER role to a user for a tenant.
 * Returns the resolved email, or throws if user not found.
 */
export async function assignOwnerRole(
  tenantId: string,
  ownerEmail: string
): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!user) {
    throw new OwnerNotFoundError(ownerEmail);
  }
  // Remove existing OWNER role(s), then assign new one
  await prisma.tenantRole.deleteMany({
    where: { tenantId, role: Role.OWNER },
  });
  await prisma.tenantRole.upsert({
    where: { tenantId_userId: { tenantId, userId: user.id } },
    create: { tenantId, userId: user.id, role: Role.OWNER },
    update: { role: Role.OWNER },
  });
  return user.email;
}

/** Clear all OWNER roles for a tenant */
export async function clearOwnerRole(tenantId: string) {
  await prisma.tenantRole.deleteMany({
    where: { tenantId, role: Role.OWNER },
  });
}

export class OwnerNotFoundError extends Error {
  constructor(email: string) {
    super(`No user found with email "${email}"`);
    this.name = "OwnerNotFoundError";
  }
}
