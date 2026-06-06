export type ProductOverview = {
  totalProducts: number;
  totalAvailableStock: number;
  unitsSoldThisMonth: number;
};

export type ProductForCampaignReview = {
  productId: string;
  sku: string;
  name: string;
  category: string;
  priceCents: number;
  availableQuantity: number;
  unitsSoldThisMonth: number;
  recentSalesSummary: string;
  signalFacts: string[];
};
