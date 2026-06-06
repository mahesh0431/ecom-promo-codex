const HIGH_STOCK_THRESHOLD = 100;
const LOW_CURRENT_MONTH_SALES_THRESHOLD = 5;

export function buildRecentSalesSummary(unitsSoldThisMonth: number) {
  return `${unitsSoldThisMonth} units sold this month`;
}

export function buildSignalFacts(input: {
  availableQuantity: number;
  unitsSoldThisMonth: number;
}) {
  const signalFacts: string[] = [];

  if (input.availableQuantity >= HIGH_STOCK_THRESHOLD) {
    signalFacts.push(`High stock: ${input.availableQuantity} units available`);
  }

  if (input.unitsSoldThisMonth <= LOW_CURRENT_MONTH_SALES_THRESHOLD) {
    signalFacts.push(
      `Low current-month sales: ${input.unitsSoldThisMonth} units sold`
    );
  }

  if (signalFacts.length === 0) {
    signalFacts.push(
      `Current-month sales: ${input.unitsSoldThisMonth} units sold`
    );
  }

  return signalFacts;
}
