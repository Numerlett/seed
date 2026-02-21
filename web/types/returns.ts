type PurchaseReturnListItem =
  TrpcAppRouterOutputType['returns']['getPurchaseReturns']['data'][number];
type PurchaseReturnDetail =
  TrpcAppRouterOutputType['returns']['getPurchaseReturnById'];
type SalesReturnListItem =
  TrpcAppRouterOutputType['returns']['getSalesReturns']['data'][number];
type SalesReturnDetail =
  TrpcAppRouterOutputType['returns']['getSalesReturnById'];

export type {
  PurchaseReturnListItem,
  PurchaseReturnDetail,
  SalesReturnListItem,
  SalesReturnDetail,
};
