import { prisma } from "@/server/db/client";
import { getCurrentMonthRange } from "@/server/dates";

async function main() {
  const { start, end } = getCurrentMonthRange();
  const [users, products, productSales, campaigns, campaignImages, sales] =
    await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.productSale.count(),
      prisma.campaign.count(),
      prisma.campaignImage.count(),
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

  console.log(`users: ${users}`);
  console.log(`products: ${products}`);
  console.log(`productSales: ${productSales}`);
  console.log(`campaigns: ${campaigns}`);
  console.log(`campaignImages: ${campaignImages}`);
  console.log(`unitsSoldThisMonth: ${sales._sum.unitsSold ?? 0}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
