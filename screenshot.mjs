import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import puppeteer from "puppeteer";

const url = process.argv[2];
const label = process.argv[3] || "";

if (!url) {
  console.error("Usage: node screenshot.mjs <url> [label] [width] [height]");
  console.error("  Use lvh.me subdomain for tenant context: http://figata-cafe.lvh.me:3000/en/admin");
  process.exit(1);
}

const dir = "screenshots";
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

// Auto-increment screenshot number
const existing = fs.readdirSync(dir).filter((f) => f.startsWith("screenshot-"));
let maxNum = 0;
for (const f of existing) {
  const match = f.match(/^screenshot-(\d+)/);
  if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
}
const num = maxNum + 1;
const filename = label
  ? `screenshot-${num}-${label}.png`
  : `screenshot-${num}.png`;
const filepath = path.join(dir, filename);

// ── Auth: create a temporary session for an admin user of the resolved tenant ──
async function getSessionToken() {
  const prisma = new PrismaClient();
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname; // e.g. "figata-cafe.lvh.me"
    const slug = hostname.split(".")[0]; // e.g. "figata-cafe"

    // Try to find a tenant role for this slug's tenant
    const tenant = await prisma.tenant.findFirst({
      where: { OR: [{ slug }, { domain: hostname }] },
    });

    let userId;
    if (tenant) {
      // Prefer non-super-admin to get the regular admin dashboard
      const role = await prisma.tenantRole.findFirst({
        where: { tenantId: tenant.id, role: { in: ["OWNER", "ADMIN"] } },
      });
      userId = role?.userId;
      if (!userId) {
        const superRole = await prisma.tenantRole.findFirst({
          where: { tenantId: tenant.id, role: "SUPER_ADMIN" },
        });
        userId = superRole?.userId;
      }
    }

    if (!userId) {
      // Fallback: any admin/owner role
      const role = await prisma.tenantRole.findFirst({
        where: { role: { in: ["OWNER", "ADMIN", "SUPER_ADMIN"] } },
      });
      userId = role?.userId;
    }

    if (!userId) {
      const user = await prisma.user.findFirst();
      userId = user?.id;
    }

    if (!userId) return null;

    const session = await prisma.session.create({
      data: {
        userId,
        sessionToken: `puppeteer-${Date.now()}`,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return session.sessionToken;
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanupSession(token) {
  if (!token) return;
  const prisma = new PrismaClient();
  try {
    await prisma.session.deleteMany({ where: { sessionToken: token } });
  } finally {
    await prisma.$disconnect();
  }
}

const sessionToken = await getSessionToken();

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

// Inject session cookie
if (sessionToken) {
  const urlObj = new URL(url);
  await page.setCookie({
    name: "next-auth.session-token",
    value: sessionToken,
    domain: urlObj.hostname,
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  });
}

const width = process.argv[4] ? parseInt(process.argv[4], 10) : 1280;
const height = process.argv[5] ? parseInt(process.argv[5], 10) : 800;
await page.setViewport({ width, height });
await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
// Wait for data to load
await new Promise((r) => setTimeout(r, 3000));
await page.screenshot({ path: filepath, fullPage: false });
await browser.close();

await cleanupSession(sessionToken);

console.log(filepath);
