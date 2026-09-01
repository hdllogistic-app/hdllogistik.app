import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { AccountSettingsView } from './AccountSettingsView';

export const metadata = {
  title: 'Pengaturan Akun | HDL LOGISTIK',
  description: 'Kelola akses login akun Admin dan Driver operasional.',
};

export default async function AccountSettingsPage() {
  await requireRole([USER_ROLES.OWNER, USER_ROLES.ADMIN]);

  return <AccountSettingsView />;
}
