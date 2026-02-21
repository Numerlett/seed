type ExpiringBatchListItem =
  TrpcAppRouterOutputType['batch']['getExpiringBatches']['data'][number];
type BatchDetail = TrpcAppRouterOutputType['batch']['getBatchById'];
type BatchByProduct =
  TrpcAppRouterOutputType['batch']['getBatchesByProduct'][number];

export type { ExpiringBatchListItem, BatchDetail, BatchByProduct };
