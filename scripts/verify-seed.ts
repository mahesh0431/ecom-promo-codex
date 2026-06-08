import { prisma } from "@/server/db/client";
import { getCurrentMonthRange } from "@/server/dates";
import {
  DEMO_EMAIL,
  EXPECTED_CURRENT_MONTH_UNITS,
  EXPECTED_SEED_PRODUCT_COUNT,
  EXPECTED_SEED_PRODUCT_SALE_COUNT,
  SEED_PRODUCT_SKUS
} from "../prisma/seed";

async function main() {
  const { start, end } = getCurrentMonthRange();
  const [
    users,
    products,
    productSales,
    campaigns,
    campaignImages,
    demoUser,
    seededProducts,
    seededSales,
    currentMonthSeededSales
  ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.productSale.count(),
    prisma.campaign.count(),
    prisma.campaignImage.count(),
    prisma.user.findUnique({
      where: {
        email: DEMO_EMAIL
      },
      select: {
        id: true
      }
    }),
    prisma.product.findMany({
      where: {
        sku: {
          in: SEED_PRODUCT_SKUS
        }
      },
      select: {
        id: true,
        sku: true
      }
    }),
    prisma.productSale.count({
      where: {
        product: {
          sku: {
            in: SEED_PRODUCT_SKUS
          }
        }
      }
    }),
    prisma.productSale.aggregate({
      _sum: { unitsSold: true },
      where: {
        product: {
          sku: {
            in: SEED_PRODUCT_SKUS
          }
        },
        saleDate: {
          gte: start,
          lt: end
        }
      }
    })
  ]);
  const unitsSoldThisMonth = currentMonthSeededSales._sum.unitsSold ?? 0;

  console.log(`users: ${users}`);
  console.log(`products: ${products}`);
  console.log(`productSales: ${productSales}`);
  console.log(`campaigns: ${campaigns}`);
  console.log(`campaignImages: ${campaignImages}`);
  console.log(`unitsSoldThisMonth: ${unitsSoldThisMonth}`);

  const seededSkus = new Set(seededProducts.map((product) => product.sku));
  const missingSkus = SEED_PRODUCT_SKUS.filter((sku) => !seededSkus.has(sku));
  const failures = [];

  if (!demoUser) {
    failures.push(`missing demo user ${DEMO_EMAIL}`);
  }

  if (seededProducts.length !== EXPECTED_SEED_PRODUCT_COUNT) {
    failures.push(
      `expected ${EXPECTED_SEED_PRODUCT_COUNT} seeded products, found ${seededProducts.length}`
    );
  }

  if (missingSkus.length > 0) {
    failures.push(`missing seeded SKUs: ${missingSkus.join(", ")}`);
  }

  if (seededSales !== EXPECTED_SEED_PRODUCT_SALE_COUNT) {
    failures.push(
      `expected ${EXPECTED_SEED_PRODUCT_SALE_COUNT} seeded product sales, found ${seededSales}`
    );
  }

  if (unitsSoldThisMonth !== EXPECTED_CURRENT_MONTH_UNITS) {
    failures.push(
      `expected ${EXPECTED_CURRENT_MONTH_UNITS} current-month seeded units, found ${unitsSoldThisMonth}`
    );
  }

  if (failures.length > 0) {
    throw new Error(`Seed verification failed:\n- ${failures.join("\n- ")}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
