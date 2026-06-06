import { prisma } from "@/server/db/client";
import { getCurrentMonthRange, formatDateOnly } from "@/server/dates";
import { AppError } from "@/server/errors";
import {
  buildRecentSalesSummary,
  buildSignalFacts
} from "@/server/products/product-signals";
import type { ProductCampaignContext } from "@/server/campaign-context/campaign-context-types";

export async function getProductCampaignContext(
  productId: string
): Promise<ProductCampaignContext> {
  const { start, end } = getCurrentMonthRange();
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      sales: {
        orderBy: { saleDate: "desc" },
        take: 12
      }
    }
  });

  if (!product) {
    throw new AppError("NOT_FOUND", "Product not found.", 404);
  }

  const unitsSoldThisMonth = product.sales
    .filter((sale) => sale.saleDate >= start && sale.saleDate < end)
    .reduce((sum, sale) => sum + sale.unitsSold, 0);

  return {
    product: {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      priceCents: product.priceCents
    },
    availableQuantity: product.availableQuantity,
    unitsSoldThisMonth,
    recentSales: product.sales.map((sale) => ({
      saleDate: formatDateOnly(sale.saleDate),
      unitsSold: sale.unitsSold
    })),
    recentSalesSummary: buildRecentSalesSummary(unitsSoldThisMonth),
    signalFacts: buildSignalFacts({
      availableQuantity: product.availableQuantity,
      unitsSoldThisMonth
    })
  };
}
