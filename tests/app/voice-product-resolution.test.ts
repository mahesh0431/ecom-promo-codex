import { describe, expect, test } from "vitest";

import { resolveProductReference } from "@/app/voice/product-resolution";
import type { VoiceProductSummary } from "@/app/voice/voice-types";

const products: VoiceProductSummary[] = [
  {
    productId: "prod-cold-brew",
    name: "Cold Brew Concentrate",
    sku: "SKU-COF-COLD-001",
    category: "Grocery",
    priceCents: 1299,
    availableQuantity: 180,
    unitsSoldThisMonth: 3,
    suggested: true
  },
  {
    productId: "prod-amber-candle",
    name: "Amber Soy Candle",
    sku: "SKU-HOM-CANDLE-005",
    category: "Home",
    priceCents: 2199,
    availableQuantity: 160,
    unitsSoldThisMonth: 5,
    suggested: true
  },
  {
    productId: "prod-pet-bed",
    name: "Washable Pet Bed",
    sku: "SKU-PET-BED-010",
    category: "Pet",
    priceCents: 3499,
    availableQuantity: 85,
    unitsSoldThisMonth: 5,
    suggested: false
  },
  {
    productId: "prod-pet-treat",
    name: "Salmon Training Treats",
    sku: "SKU-PET-TREAT-009",
    category: "Pet",
    priceCents: 999,
    availableQuantity: 125,
    unitsSoldThisMonth: 5,
    suggested: false
  }
];

describe("voice product resolution", () => {
  test("matches exact SKUs and natural partial product names", () => {
    expect(resolveProductReference(products, "SKU-COF-COLD-001")).toMatchObject({
      kind: "matched",
      product: { productId: "prod-cold-brew" }
    });
    expect(resolveProductReference(products, "amber candle")).toMatchObject({
      kind: "matched",
      product: { productId: "prod-amber-candle" }
    });
  });

  test("returns ambiguity when a spoken reference matches multiple products evenly", () => {
    const result = resolveProductReference(products, "pet");

    expect(result.kind).toBe("ambiguous");
    if (result.kind === "ambiguous") {
      expect(result.matches.map((product) => product.productId)).toEqual([
        "prod-pet-bed",
        "prod-pet-treat"
      ]);
    }
  });
});
