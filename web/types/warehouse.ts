type WarehouseListItem =
  TrpcAppRouterOutputType['warehouse']['getWarehouses'][number];
type WarehouseDetail = TrpcAppRouterOutputType['warehouse']['getWarehouseById'];
type ShelfItem =
  TrpcAppRouterOutputType['warehouse']['getShelvesByWarehouse'][number];

export type { WarehouseListItem, WarehouseDetail, ShelfItem };
