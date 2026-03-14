import { PrismaClient } from "@prisma/client";
import { applyPreset, presets } from "./presets";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.invoice.deleteMany();
  await prisma.invoiceSequence.deleteMany();
  await prisma.orderItemModifier.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.productModifierGroup.deleteMany();
  await prisma.modifierOption.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.tenantRole.deleteMany();
  await prisma.operatingHour.deleteMany();
  await prisma.tenantConfig.deleteMany();
  await prisma.tenant.deleteMany();

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      emailVerified: new Date(),
    },
  });

  console.log("✅ Test user created:", user.email);

  // ─── Tenant 1: Figata Cafe ───────────────────────────────

  const tenant1 = await prisma.tenant.create({
    data: {
      name: "Figata Cafe",
      slug: "figata-cafe",
      phone: "+30 210 1234567",
      email: "info@figata.gr",
      address: "Ermou 42, Athens 10563",
      prepTimeMinutes: 10,
      currency: "EUR",
      timezone: "Europe/Athens",
      config: {
        create: {
          primaryColor: "#1a1a2e",
          secondaryColor: "#e2e2e2",
          accentColor: "#e94560",
          description: "Specialty coffee & pastries in the heart of Athens",
          pwaName: "Figata Cafe",
          pwaShortName: "Figata",
          pwaThemeColor: "#1a1a2e",
          pwaBgColor: "#ffffff",
        },
      },
    },
  });

  // Operating hours (Mon-Sat 8:00-23:00, Sun 9:00-22:00)
  for (let day = 0; day < 7; day++) {
    await prisma.operatingHour.create({
      data: {
        tenantId: tenant1.id,
        dayOfWeek: day,
        openTime: day === 6 ? "09:00" : "08:00",
        closeTime: day === 6 ? "22:00" : "23:00",
      },
    });
  }

  // Apply coffee shop preset
  await applyPreset(prisma, tenant1.id, presets["coffee-shop"]);

  // Assign admin as OWNER
  await prisma.tenantRole.create({
    data: {
      tenantId: tenant1.id,
      userId: user.id,
      role: "OWNER",
    },
  });

  // Also make admin a SUPER_ADMIN (on a different "system" tenant role)
  // We'll use tenant1 as the reference for SUPER_ADMIN
  await prisma.tenantRole.create({
    data: {
      tenantId: tenant1.id,
      userId: user.id,
      role: "SUPER_ADMIN",
    },
  }).catch(() => {
    // unique constraint — already has a role for this tenant
    // Update existing role instead
    return prisma.tenantRole.update({
      where: { tenantId_userId: { tenantId: tenant1.id, userId: user.id } },
      data: { role: "SUPER_ADMIN" },
    });
  });

  // Invoice sequence
  await prisma.invoiceSequence.create({
    data: {
      tenantId: tenant1.id,
      series: "A",
      lastNumber: 0,
    },
  });

  console.log("✅ Figata Cafe created with coffee shop menu");

  // ─── Tenant 2: Souvlakia.gr ──────────────────────────────

  const tenant2 = await prisma.tenant.create({
    data: {
      name: "Souvlakia.gr",
      slug: "souvlakia-gr",
      phone: "+30 210 7654321",
      email: "info@souvlakia.gr",
      address: "Monastiraki Square 5, Athens 10555",
      prepTimeMinutes: 15,
      currency: "EUR",
      timezone: "Europe/Athens",
      config: {
        create: {
          primaryColor: "#b71c1c",
          secondaryColor: "#fff8e1",
          accentColor: "#ff6f00",
          description: "Authentic Greek souvlaki & grilled meats",
          pwaName: "Souvlakia.gr",
          pwaShortName: "Souvlakia",
          pwaThemeColor: "#b71c1c",
          pwaBgColor: "#fff8e1",
        },
      },
    },
  });

  for (let day = 0; day < 7; day++) {
    await prisma.operatingHour.create({
      data: {
        tenantId: tenant2.id,
        dayOfWeek: day,
        openTime: "11:00",
        closeTime: day >= 5 ? "02:00" : "00:00", // weekend late closing
      },
    });
  }

  await applyPreset(prisma, tenant2.id, presets["souvlaki-shop"]);

  await prisma.tenantRole.create({
    data: {
      tenantId: tenant2.id,
      userId: user.id,
      role: "OWNER",
    },
  });

  await prisma.invoiceSequence.create({
    data: {
      tenantId: tenant2.id,
      series: "A",
      lastNumber: 0,
    },
  });

  console.log("✅ Souvlakia.gr created with souvlaki menu");
  console.log("\n🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
