import { describe, expect, test } from "vitest";

import { seedDemoData } from "../../prisma/seed";
import { prisma } from "@/server/db/client";

describe("seed data", () => {
  test("can be rerun without duplicating demo rows", async () => {
    await seedDemoData();

    await expect(prisma.user.count()).resolves.toBe(1);
    await expect(prisma.product.count()).resolves.toBe(10);
    await expect(prisma.productSale.count()).resolves.toBe(40);
    await expect(prisma.campaign.count()).resolves.toBe(0);
    await expect(prisma.campaignImage.count()).resolves.toBe(0);
  });
});
