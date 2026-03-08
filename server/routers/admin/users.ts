import { listUsers, getUserDetail, deleteUser } from '../../controllers/admin/users';
import { t } from '../../trpc';

export const adminUsersRoutes = t.router({
  listUsers,
  getUserDetail,
  deleteUser,
});
