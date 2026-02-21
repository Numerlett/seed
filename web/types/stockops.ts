type StockAdjustmentListItem =
  TrpcAppRouterOutputType['stockops']['getStockAdjustments']['data'][number];
type StockAdjustmentDetail =
  TrpcAppRouterOutputType['stockops']['getStockAdjustmentById'];
type StockTransferListItem =
  TrpcAppRouterOutputType['stockops']['getStockTransfers']['data'][number];
type StockTransferDetail =
  TrpcAppRouterOutputType['stockops']['getStockTransferById'];
type DamageReportListItem =
  TrpcAppRouterOutputType['stockops']['getDamageReports']['data'][number];
type DamageReportDetail =
  TrpcAppRouterOutputType['stockops']['getDamageReportById'];

export type {
  StockAdjustmentListItem,
  StockAdjustmentDetail,
  StockTransferListItem,
  StockTransferDetail,
  DamageReportListItem,
  DamageReportDetail,
};
