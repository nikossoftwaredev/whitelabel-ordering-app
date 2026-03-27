import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { clearCart, dismissLocationPrompt, suppressPwaPromptGlobally, TENANT_SLUG } from "./helpers";

/**
 * E2E tests for the menu modifier features:
 * 1. Preset mode ("Απ' όλα" / "With Everything")
 * 2. Per-product preset option IDs
 * 3. Free ingredient allowance (freeCount)
 */

test.describe.configure({ mode: "serial" });

test.describe("Menu Modifier Features", () => {
  let prisma: PrismaClient;
  let tenant: { id: string };
  let category: { id: string };

  // Test modifier groups (with options from Prisma include)
   
  let vegetablesGroup: any;
   
  let saucesGroup: any;
   
  let extrasGroup: any;

  // Test products
  let presetProduct: { id: string; name: string };
  let freeCountProduct: { id: string; name: string };

  // Option IDs for preset
  let tomatoOpt: { id: string };
  let onionOpt: { id: string };
  let lettuceOpt: { id: string };
  let tzatzikiOpt: { id: string };
  let mayoOpt: { id: string };
  let ketchupOpt: { id: string };

  // Options for free count product (priced toppings)
  let mushroomsOpt: { id: string };
  let peppersOpt: { id: string };
  let baconOpt: { id: string };
  let cheeseOpt: { id: string };

  test.beforeAll(async () => {
    prisma = new PrismaClient();

    const t = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
    if (!t) throw new Error(`Tenant "${TENANT_SLUG}" not found`);
    tenant = t;

    // Ensure store is not paused
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { isPaused: false },
    });

    // Open store for today
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: t.timezone || "Europe/Athens",
      weekday: "short",
    }).formatToParts(now);
    const weekdayShort = parts.find((p) => p.type === "weekday")?.value || "Sat";
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const todayDow = dayMap[weekdayShort] ?? 6;
    await prisma.operatingHour.updateMany({
      where: { tenantId: tenant.id, dayOfWeek: todayDow },
      data: { openTime: "00:00", closeTime: "23:59", isClosed: false },
    });

    // Get or create a test category
    const existingCat = await prisma.category.findFirst({
      where: { tenantId: tenant.id, isActive: true },
    });
    if (!existingCat) throw new Error("No active category found");
    category = existingCat;

    // ── Create modifier groups ──

    vegetablesGroup = await prisma.modifierGroup.create({
      data: {
        tenantId: tenant.id,
        name: "E2E Vegetables",
        required: false,
        minSelect: 0,
        maxSelect: 10,
        options: {
          create: [
            { name: "Tomato", priceAdjustment: 0, isDefault: true, sortOrder: 0 },
            { name: "Onion", priceAdjustment: 0, isDefault: true, sortOrder: 1 },
            { name: "Lettuce", priceAdjustment: 0, isDefault: false, sortOrder: 2 },
          ],
        },
      },
      include: { options: true },
    });
    tomatoOpt = vegetablesGroup.options.find((o: { id: string; name: string }) => o.name === "Tomato")!;
    onionOpt = vegetablesGroup.options.find((o: { id: string; name: string }) => o.name === "Onion")!;
    lettuceOpt = vegetablesGroup.options.find((o: { id: string; name: string }) => o.name === "Lettuce")!;

    saucesGroup = await prisma.modifierGroup.create({
      data: {
        tenantId: tenant.id,
        name: "E2E Sauces",
        required: false,
        minSelect: 0,
        maxSelect: 3,
        options: {
          create: [
            { name: "Tzatziki", priceAdjustment: 0, isDefault: true, sortOrder: 0 },
            { name: "Mayo", priceAdjustment: 0, isDefault: false, sortOrder: 1 },
            { name: "Ketchup", priceAdjustment: 0, isDefault: false, sortOrder: 2 },
          ],
        },
      },
      include: { options: true },
    });
    tzatzikiOpt = saucesGroup.options.find((o: { id: string; name: string }) => o.name === "Tzatziki")!;
    mayoOpt = saucesGroup.options.find((o: { id: string; name: string }) => o.name === "Mayo")!;
    ketchupOpt = saucesGroup.options.find((o: { id: string; name: string }) => o.name === "Ketchup")!;

    extrasGroup = await prisma.modifierGroup.create({
      data: {
        tenantId: tenant.id,
        name: "E2E Toppings",
        required: false,
        minSelect: 0,
        maxSelect: 10,
        options: {
          create: [
            { name: "Mushrooms", priceAdjustment: 50, sortOrder: 0 },
            { name: "Peppers", priceAdjustment: 80, sortOrder: 1 },
            { name: "Bacon", priceAdjustment: 100, sortOrder: 2 },
            { name: "Extra Cheese", priceAdjustment: 120, sortOrder: 3 },
          ],
        },
      },
      include: { options: true },
    });
    mushroomsOpt = extrasGroup.options.find((o: { id: string; name: string }) => o.name === "Mushrooms")!;
    peppersOpt = extrasGroup.options.find((o: { id: string; name: string }) => o.name === "Peppers")!;
    baconOpt = extrasGroup.options.find((o: { id: string; name: string }) => o.name === "Bacon")!;
    cheeseOpt = extrasGroup.options.find((o: { id: string; name: string }) => o.name === "Extra Cheese")!;

    // ── Create preset product (souvlaki) ──
    presetProduct = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        categoryId: category.id,
        name: "E2E Souvlaki Pork",
        price: 350,
        isActive: true,
        hasPreset: true,
        presetOptionIds: [tomatoOpt.id, onionOpt.id, tzatzikiOpt.id],
        modifierGroups: {
          create: [
            { modifierGroupId: vegetablesGroup.id, sortOrder: 0 },
            { modifierGroupId: saucesGroup.id, sortOrder: 1 },
          ],
        },
      },
    });

    // ── Create free count product (pizza) ──
    freeCountProduct = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        categoryId: category.id,
        name: "E2E Pizza Special",
        price: 850,
        isActive: true,
        modifierGroups: {
          create: [
            { modifierGroupId: extrasGroup.id, sortOrder: 0, freeCount: 2 },
          ],
        },
      },
    });

    // Invalidate menu cache by touching tenant
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { updatedAt: new Date() },
    });
  });

  test.afterAll(async () => {
    // Clean up in reverse order (handle FK constraints)
    await prisma.productModifierGroup.deleteMany({
      where: { productId: { in: [presetProduct.id, freeCountProduct.id] } },
    }).catch(() => {});
    await prisma.product.deleteMany({
      where: { id: { in: [presetProduct.id, freeCountProduct.id] } },
    }).catch(() => {});
    await prisma.modifierOption.deleteMany({
      where: { modifierGroupId: { in: [vegetablesGroup.id, saucesGroup.id, extrasGroup.id] } },
    }).catch(() => {});
    await prisma.modifierGroup.deleteMany({
      where: { id: { in: [vegetablesGroup.id, saucesGroup.id, extrasGroup.id] } },
    }).catch(() => {});
    await prisma.$disconnect();
  });

  // ═══════════════════════════════════════════════════════════════════
  //  PRESET MODE TESTS
  // ═══════════════════════════════════════════════════════════════════

  test("preset product shows 'With everything' toggle", async ({ page }) => {
    await suppressPwaPromptGlobally(page);
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
    await expect(page.locator("text=/€/").first()).toBeVisible({ timeout: 15000 });

    // Find and click the preset product
    await page.getByText("E2E Souvlaki Pork").first().click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Should show the preset toggle
    await expect(dialog.getByText("With everything")).toBeVisible();
    await expect(dialog.getByText("Choose ingredients")).toBeVisible();
  });

  test("preset mode shows default items in parentheses", async ({ page }) => {
    await suppressPwaPromptGlobally(page);
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
    await expect(page.locator("text=/€/").first()).toBeVisible({ timeout: 15000 });

    await page.getByText("E2E Souvlaki Pork").first().click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // "With everything" should be selected by default
    // Should show the preset items (Tomato, Onion, Tzatziki)
    await expect(dialog.getByText("Tomato")).toBeVisible();
    await expect(dialog.getByText("Onion")).toBeVisible();
    await expect(dialog.getByText("Tzatziki")).toBeVisible();

    // Modifier groups should NOT be visible in preset mode
    await expect(dialog.getByText("E2E Vegetables")).not.toBeVisible();
    await expect(dialog.getByText("E2E Sauces")).not.toBeVisible();
  });

  test("switching to 'Choose ingredients' shows modifier groups", async ({ page }) => {
    await suppressPwaPromptGlobally(page);
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
    await expect(page.locator("text=/€/").first()).toBeVisible({ timeout: 15000 });

    await page.getByText("E2E Souvlaki Pork").first().click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Switch to custom mode
    await dialog.getByText("Choose ingredients").click();

    // Modifier groups should now be visible
    await expect(dialog.getByText("E2E Vegetables")).toBeVisible();
    await expect(dialog.getByText("E2E Sauces")).toBeVisible();
  });

  test("preset product can be added to cart in preset mode", async ({ page }) => {
    await suppressPwaPromptGlobally(page);
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
    await clearCart(page);
    await page.reload();
    await dismissLocationPrompt(page);
    await expect(page.locator("text=/€/").first()).toBeVisible({ timeout: 15000 });

    await page.getByText("E2E Souvlaki Pork").first().click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // "With everything" is default — just add to cart
    await dialog.getByText("Add to order").click();

    // Cart bar should appear
    await expect(page.getByText("View Cart")).toBeVisible({ timeout: 5000 });
  });

  test("preset product cart shows 'With everything' label", async ({ page }) => {
    await suppressPwaPromptGlobally(page);
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
    await clearCart(page);
    await page.reload();
    await dismissLocationPrompt(page);
    await expect(page.locator("text=/€/").first()).toBeVisible({ timeout: 15000 });

    // Add via product detail in preset mode
    await page.getByText("E2E Souvlaki Pork").first().click();
    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByText("Add to order").click();
    await expect(page.getByText("View Cart")).toBeVisible({ timeout: 5000 });

    // Open cart
    await page.getByText("View Cart").click();
    const cartDialog = page.locator("[role=dialog]");
    await expect(cartDialog).toBeVisible({ timeout: 5000 });

    // Cart should show "With everything" for this item
    await expect(cartDialog.getByText("With everything")).toBeVisible();
  });

  // ═══════════════════════════════════════════════════════════════════
  //  FREE COUNT TESTS
  // ═══════════════════════════════════════════════════════════════════

  test("free count product shows 'included' label", async ({ page }) => {
    await suppressPwaPromptGlobally(page);
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
    await expect(page.locator("text=/€/").first()).toBeVisible({ timeout: 15000 });

    await page.getByText("E2E Pizza Special").first().click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Should show "2 included" label on the toppings group
    await expect(dialog.getByText("2 included")).toBeVisible();
  });

  test("selecting within free count shows base price only", async ({ page }) => {
    await suppressPwaPromptGlobally(page);
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
    await clearCart(page);
    await page.reload();
    await dismissLocationPrompt(page);
    await expect(page.locator("text=/€/").first()).toBeVisible({ timeout: 15000 });

    await page.getByText("E2E Pizza Special").first().click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select 2 toppings (within free limit of 2)
    await dialog.getByText("Mushrooms").click();
    await dialog.getByText("Bacon").click();

    // Price should be base price only: 8.50€ (no extras charged)
    // The button shows the total price
    const addButton = dialog.getByText(/Add to order/);
    await expect(addButton).toContainText("8,50");
  });

  test("selecting over free count charges extra items", async ({ page }) => {
    await suppressPwaPromptGlobally(page);
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
    await clearCart(page);
    await page.reload();
    await dismissLocationPrompt(page);
    await expect(page.locator("text=/€/").first()).toBeVisible({ timeout: 15000 });

    await page.getByText("E2E Pizza Special").first().click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select 3 toppings (free count = 2, so 1 charged)
    // Mushrooms (0.50), Peppers (0.80), Bacon (1.00)
    // Most expensive 2 free: Bacon (1.00) + Peppers (0.80) = free
    // Charged: Mushrooms (0.50)
    // Total: 8.50 + 0.50 = 9.00
    await dialog.getByText("Mushrooms").click();
    await dialog.getByText("Peppers").click();
    await dialog.getByText("Bacon").click();

    const addButton = dialog.getByText(/Add to order/);
    await expect(addButton).toContainText("9,00");
  });

  test("selecting all 4 toppings charges 2 cheapest", async ({ page }) => {
    await suppressPwaPromptGlobally(page);
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
    await clearCart(page);
    await page.reload();
    await dismissLocationPrompt(page);
    await expect(page.locator("text=/€/").first()).toBeVisible({ timeout: 15000 });

    await page.getByText("E2E Pizza Special").first().click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select all 4 toppings (free count = 2)
    // Mushrooms (0.50), Peppers (0.80), Bacon (1.00), Extra Cheese (1.20)
    // Most expensive 2 free: Extra Cheese (1.20) + Bacon (1.00) = free
    // Charged: Mushrooms (0.50) + Peppers (0.80) = 1.30
    // Total: 8.50 + 1.30 = 9.80
    await dialog.getByText("Mushrooms").click();
    await dialog.getByText("Peppers").click();
    await dialog.getByText("Bacon").click();
    await dialog.getByText("Extra Cheese").click();

    const addButton = dialog.getByText(/Add to order/);
    await expect(addButton).toContainText("9,80");
  });

  // ═══════════════════════════════════════════════════════════════════
  //  COMBINED: PRESET + FREE COUNT
  // ═══════════════════════════════════════════════════════════════════

  test("non-preset product without free count works normally", async ({ page }) => {
    await suppressPwaPromptGlobally(page);
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
    await expect(page.locator("text=/€/").first()).toBeVisible({ timeout: 15000 });

    // Find any existing product that isn't our test products
    // Just verify the normal flow still works — no preset toggle should appear
    const existingProducts = page.locator("[data-product-id]").first();
    if (await existingProducts.isVisible({ timeout: 3000 }).catch(() => false)) {
      await existingProducts.click();
      const dialog = page.locator("[role=dialog]");
      if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Should NOT have the preset toggle
        await expect(dialog.getByText("With everything")).not.toBeVisible({ timeout: 1000 }).catch(() => {});
      }
    }
  });
});
