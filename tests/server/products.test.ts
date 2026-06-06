import { describe, expect, test } from "vitest";

import {
  getProductOverview,
  listProductsForCampaignReview
} from "@/server/products/product-service";
import { getProductCampaignContext } from "@/server/campaign-context/campaign-context-service";

describe("product services", () => {
  test("computes the seeded product overview", async () => {
    const overview = await getProductOverview();

    expect(overview).toEqual({
      totalProducts: 10,
      totalAvailableStock: 1075,
      unitsSoldThisMonth: 120
    });
  });

  test("lists products with campaign review facts", async () => {
    const products = await listProductsForCampaignReview();

    expect(products).toHaveLength(10);
    expect(products[0]).toMatchObject({
      sku: "SKU-COF-COLD-001",
      name: "Cold Brew Concentrate",
      availableQuantity: 180,
      unitsSoldThisMonth: 3,
      recentSalesSummary: "3 units sold this month"
    });
    expect(products[0]?.signalFacts).toContain("High stock: 180 units available");
    expect(products[0]?.signalFacts).toContain("Low current-month sales: 3 units sold");
  });

  test("returns campaign context for one product", async () => {
    const products = await listProductsForCampaignReview();
    const coldBrew = products.find((product) => product.sku === "SKU-COF-COLD-001");

    expect(coldBrew).toBeDefined();

    const context = await getProductCampaignContext(coldBrew!.productId);

    expect(context).toMatchObject({
      product: {
        sku: "SKU-COF-COLD-001",
        name: "Cold Brew Concentrate",
        category: "Grocery",
        priceCents: 1299
      },
      availableQuantity: 180,
      unitsSoldThisMonth: 3,
      recentSalesSummary: "3 units sold this month"
    });
    expect(context.recentSales.length).toBeGreaterThanOrEqual(3);
    expect(context.signalFacts).toEqual(
      expect.arrayContaining([
        "High stock: 180 units available",
        "Low current-month sales: 3 units sold"
      ])
    );
  });
});
