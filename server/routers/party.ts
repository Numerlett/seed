import {
  getPartiesByBusinessId,
  getPartyCount,
  getPartyById,
  createParty,
  updateParty,
  deleteParty,
  bulkDeleteParties,
  addAddressToParty,
  updateAddress,
  deleteAddress,
} from '../controllers/party';
import { t } from '../trpc';

export const partyRoutes = t.router({
  getPartiesByBusinessId,
  getPartyCount,
  getPartyById,
  createParty,
  updateParty,
  deleteParty,
  bulkDeleteParties,
  addAddressToParty,
  updateAddress,
  deleteAddress,
});
