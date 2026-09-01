import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { OperationalSettlementView } from './OperationalSettlementView';

export const metadata = {
  title: 'Operasional Settlement | HDL LOGISTIK',
  description: 'Input dan kontrol pengeluaran operasional harian.',
};

export default async function OperationalSettlementPage() {
  await requireRole([
    USER_ROLES.OWNER,
    USER_ROLES.ADMIN,
    USER_ROLES.FINANCE,
    USER_ROLES.OPS,
  ]);

  return <OperationalSettlementView />;
}
