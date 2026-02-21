type PurchaseOrderListItem =
  TrpcAppRouterOutputType['purchase']['getPurchaseOrders']['data'][number];
type PurchaseOrderDetail =
  TrpcAppRouterOutputType['purchase']['getPurchaseOrderById'];
type GRNListItem =
  TrpcAppRouterOutputType['purchase']['getGRNs']['data'][number];
type GRNDetail = TrpcAppRouterOutputType['purchase']['getGRNById'];

export type {
  PurchaseOrderListItem,
  PurchaseOrderDetail,
  GRNListItem,
  GRNDetail,
};
