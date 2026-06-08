import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, test } from "vitest";

import { isDirectScriptRun, seedDemoData } from "../../prisma/seed";
import { prisma } from "@/server/db/client";

describe("seed data", () => {
  test("detects direct execution when the project path contains spaces", () => {
    const scriptPath = join(process.cwd(), "path with spaces", "seed.ts");

    expect(isDirectScriptRun(pathToFileURL(scriptPath).href, scriptPath)).toBe(
      true
    );
    expect(
      isDirectScriptRun(pathToFileURL(scriptPath).href, undefined)
    ).toBe(false);
    expect(
      isDirectScriptRun(
        pathToFileURL(scriptPath).href,
        join(process.cwd(), "different-seed.ts")
      )
    ).toBe(false);
  });

  test("can be rerun without duplicating demo rows", async () => {
    await prisma.campaignImage.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany({
      where: {
        email: {
          not: "demo@promo.test"
        }
      }
    });

    await seedDemoData();

    await expect(prisma.user.count()).resolves.toBe(1);
    await expect(prisma.product.count()).resolves.toBe(10);
    await expect(prisma.productSale.count()).resolves.toBe(40);
    await expect(prisma.campaign.count()).resolves.toBe(0);
    await expect(prisma.campaignImage.count()).resolves.toBe(0);
  });
});
