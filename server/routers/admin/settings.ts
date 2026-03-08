import { getSettings, updateSetting } from '../../controllers/admin/settings';
import { t } from '../../trpc';

export const adminSettingsRoutes = t.router({
  getSettings,
  updateSetting,
});
