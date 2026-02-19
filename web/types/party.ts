type PartyWithDetails =
  TrpcAppRouterOutputType['party']['getPartiesByBusinessId']['parties'][number];

type PartyWithBusiness = TrpcAppRouterOutputType['party']['getPartyById'];

type Address = PartyWithDetails['addresses'][number];

export type { PartyWithDetails, PartyWithBusiness, Address };
