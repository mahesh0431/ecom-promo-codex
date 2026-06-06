import { prisma } from "@/server/db/client";
import { getCurrentMonthRange } from "@/server/dates";
import {
  buildRecentSalesSummary,
  buildSignalFacts
} from "@/server/products/product-signals";
import type {
  ProductForCampaignReview,
  ProductOverview
} from "@/server/products/product-types";

export async function getProductOverview(): Promise<ProductOverview> {
  const { start, end } = getCurrentMonthRange();
  const [totalProducts, stock, sales] = await Promise.all([
    prisma.product.count(),
    prisma.product.aggregate({ _sum: { availableQuantity: true } }),
    prisma.productSale.aggregate({
      _sum: { unitsSold: true },
      where: {
        saleDate: {
          gte: start,
          lt: end
        }
      }
    })
  ]);

  return {
    totalProducts,
    totalAvailableStock: stock._sum.availableQuantity ?? 0,
    unitsSoldThisMonth: sales._sum.unitsSold ?? 0
  };
}

export async function listProductsForCampaignReview(): Promise<
  ProductForCampaignReview[]
> {
  const { start, end } = getCurrentMonthRange();
  const products = await prisma.product.findMany({
    orderBy: { sku: "asc" },
    include: {
      sales: {
        where: {
          saleDate: {
            gte: start,
            lt: end
          }
        }
      }
    }
  });

  return products.map((product) => {
    const unitsSoldThisMonth = product.sales.reduce(
      (sum, sale) => sum + sale.unitsSold,
      0
    );

    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      priceCents: product.priceCents,
      availableQuantity: product.availableQuantity,
      unitsSoldThisMonth,
      recentSalesSummary: buildRecentSalesSummary(unitsSoldThisMonth),
      signalFacts: buildSignalFacts({
        availableQuantity: product.availableQuantity,
        unitsSoldThisMonth
      })
    };
  });
}
