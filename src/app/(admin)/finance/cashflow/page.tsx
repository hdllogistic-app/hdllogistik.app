import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { CashflowView } from './CashflowView';

export const metadata = {
  title: 'Cashflow & Laba Rugi | HDL LOGISTIK',
  description: 'Pantau omzet, biaya operasional, biaya team, dan laba rugi.',
};

export default async function CashflowPage() {
  await requireRole([
    USER_ROLES.OWNER,
    USER_ROLES.ADMIN,
    USER_ROLES.FINANCE,
    USER_ROLES.OPS,
  ]);

  return <CashflowView />;
}
