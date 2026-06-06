export type RecentSale = {
  saleDate: string;
  unitsSold: number;
};

export type ProductCampaignContext = {
  product: {
    productId: string;
    sku: string;
    name: string;
    category: string;
    priceCents: number;
  };
  availableQuantity: number;
  unitsSoldThisMonth: number;
  recentSales: RecentSale[];
  recentSalesSummary: string;
  signalFacts: string[];
};
