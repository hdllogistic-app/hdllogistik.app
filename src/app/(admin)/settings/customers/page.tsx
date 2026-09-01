import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { CustomerSettingsView } from './CustomerSettingsView';

export const metadata = {
  title: 'Pengaturan Customer | HDL LOGISTIK',
  description: 'Kelola master customer penagihan, kode customer, dan alamat resmi.',
};

export default async function CustomerSettingsPage() {
  await requireRole([
    USER_ROLES.OWNER,
    USER_ROLES.ADMIN,
    USER_ROLES.OPS,
  ]);

  return <CustomerSettingsView />;
}
