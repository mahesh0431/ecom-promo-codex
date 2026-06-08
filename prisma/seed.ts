import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { prisma } from "@/server/db/client";
import { hashPassword } from "@/server/auth/password";

type SeedProduct = {
  sku: string;
  name: string;
  category: string;
  priceCents: number;
  availableQuantity: number;
  currentMonthUnits: number;
  priorMonthUnits: number;
};

export const DEMO_EMAIL = "demo@promo.test";
const DEMO_PASSWORD = "demo-password";

const seedProducts: SeedProduct[] = [
  {
    sku: "SKU-COF-COLD-001",
    name: "Cold Brew Concentrate",
    category: "Grocery",
    priceCents: 1299,
    availableQuantity: 180,
    currentMonthUnits: 3,
    priorMonthUnits: 18
  },
  {
    sku: "SKU-TEA-MATCHA-002",
    name: "Ceremonial Matcha Tin",
    category: "Grocery",
    priceCents: 2499,
    availableQuantity: 95,
    currentMonthUnits: 18,
    priorMonthUnits: 22
  },
  {
    sku: "SKU-SKN-SERUM-003",
    name: "Vitamin C Serum",
    category: "Beauty",
    priceCents: 1899,
    availableQuantity: 140,
    currentMonthUnits: 4,
    priorMonthUnits: 17
  },
  {
    sku: "SKU-SKN-MOIST-004",
    name: "Daily Gel Moisturizer",
    category: "Beauty",
    priceCents: 1599,
    availableQuantity: 75,
    currentMonthUnits: 17,
    priorMonthUnits: 21
  },
  {
    sku: "SKU-HOM-CANDLE-005",
    name: "Amber Soy Candle",
    category: "Home",
    priceCents: 2199,
    availableQuantity: 160,
    currentMonthUnits: 5,
    priorMonthUnits: 16
  },
  {
    sku: "SKU-HOM-TOWEL-006",
    name: "Waffle Hand Towel Set",
    category: "Home",
    priceCents: 2799,
    availableQuantity: 60,
    currentMonthUnits: 16,
    priorMonthUnits: 19
  },
  {
    sku: "SKU-FIT-BAND-007",
    name: "Resistance Band Kit",
    category: "Fitness",
    priceCents: 1999,
    availableQuantity: 110,
    currentMonthUnits: 22,
    priorMonthUnits: 25
  },
  {
    sku: "SKU-FIT-BOTTLE-008",
    name: "Insulated Training Bottle",
    category: "Fitness",
    priceCents: 1799,
    availableQuantity: 45,
    currentMonthUnits: 25,
    priorMonthUnits: 27
  },
  {
    sku: "SKU-PET-TREAT-009",
    name: "Salmon Training Treats",
    category: "Pet",
    priceCents: 999,
    availableQuantity: 125,
    currentMonthUnits: 5,
    priorMonthUnits: 14
  },
  {
    sku: "SKU-PET-BED-010",
    name: "Washable Pet Bed",
    category: "Pet",
    priceCents: 3499,
    availableQuantity: 85,
    currentMonthUnits: 5,
    priorMonthUnits: 15
  }
];

export const EXPECTED_SEED_PRODUCT_COUNT = seedProducts.length;
export const EXPECTED_SEED_PRODUCT_SALE_COUNT = seedProducts.length * 4;
export const EXPECTED_CURRENT_MONTH_UNITS = seedProducts.reduce(
  (total, product) => total + product.currentMonthUnits,
  0
);
export const SEED_PRODUCT_SKUS = seedProducts.map((product) => product.sku);

export async function seedDemoData() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash },
    create: {
      email: DEMO_EMAIL,
      passwordHash
    }
  });

  const products = [];

  for (const product of seedProducts) {
    products.push(
      await prisma.product.upsert({
        where: { sku: product.sku },
        update: {
          name: product.name,
          category: product.category,
          priceCents: product.priceCents,
          availableQuantity: product.availableQuantity
        },
        create: {
          sku: product.sku,
          name: product.name,
          category: product.category,
          priceCents: product.priceCents,
          availableQuantity: product.availableQuantity
        }
      })
    );
  }

  await prisma.productSale.deleteMany({
    where: {
      productId: {
        in: products.map((product) => product.id)
      }
    }
  });

  for (const product of products) {
    const seedProduct = seedProducts.find((item) => item.sku === product.sku);

    if (!seedProduct) {
      continue;
    }

    await prisma.productSale.createMany({
      data: buildSalesRows(product.id, seedProduct)
    });
  }

  return { user, products };
}

function buildSalesRows(productId: string, product: SeedProduct) {
  const now = new Date();
  const currentMonthFirst = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const currentMonthRecent = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), Math.max(1, now.getUTCDate()))
  );
  const priorMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15)
  );
  const twoMonthsAgo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 20)
  );
  const firstCurrentUnits = Math.floor(product.currentMonthUnits / 2);
  const secondCurrentUnits = product.currentMonthUnits - firstCurrentUnits;

  return [
    {
      productId,
      saleDate: currentMonthFirst,
      unitsSold: firstCurrentUnits
    },
    {
      productId,
      saleDate: currentMonthRecent,
      unitsSold: secondCurrentUnits
    },
    {
      productId,
      saleDate: priorMonth,
      unitsSold: product.priorMonthUnits
    },
    {
      productId,
      saleDate: twoMonthsAgo,
      unitsSold: Math.max(1, product.priorMonthUnits - 4)
    }
  ];
}

async function main() {
  const result = await seedDemoData();

  console.log(`seeded user: ${result.user.email}`);
  console.log(`seeded products: ${result.products.length}`);
}

export function isDirectScriptRun(metaUrl: string, argvPath = process.argv[1]) {
  return Boolean(argvPath) && fileURLToPath(metaUrl) === resolve(argvPath);
}

if (isDirectScriptRun(import.meta.url)) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
