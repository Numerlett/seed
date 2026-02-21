type SaleInvoiceListItem =
  TrpcAppRouterOutputType['sales']['getSaleInvoices']['data'][number];
type SaleInvoiceDetail = TrpcAppRouterOutputType['sales']['getSaleInvoiceById'];

export type { SaleInvoiceListItem, SaleInvoiceDetail };
