import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { InvoiceView } from './InvoiceView';

export const metadata = {
  title: 'Invoice Penagihan | HDL LOGISTIK',
  description: 'Kelola penagihan resi customer dan pembayaran invoice.',
};

export default async function InvoicesPage() {
  await requireRole([
    USER_ROLES.OWNER,
    USER_ROLES.ADMIN,
    USER_ROLES.FINANCE,
    USER_ROLES.OPS,
  ]);

  return <InvoiceView />;
}
