type ProductWithCategory =
  TrpcAppRouterOutputType['inventory']['getProducts']['products'][number];

// Stock types
type StockSummaryItem =
  TrpcAppRouterOutputType['stock']['getStockSummary']['data'][number];
type StockByProduct = TrpcAppRouterOutputType['stock']['getStockByProduct'];
type LowStockAlert =
  TrpcAppRouterOutputType['stock']['getLowStockAlerts']['data'][number];
type ProductLedgerEntry =
  TrpcAppRouterOutputType['stock']['getProductLedger']['data'][number];

export type {
  ProductWithCategory,
  StockSummaryItem,
  StockByProduct,
  LowStockAlert,
  ProductLedgerEntry,
};
