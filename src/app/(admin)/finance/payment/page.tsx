import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { PaymentView } from './PaymentView';

export const metadata = {
  title: 'Payment & Settlement Resi | HDL LOGISTIK',
  description: 'Kelola adjustment dan settlement pembayaran setiap resi.',
};

export default async function PaymentPage() {
  await requireRole([
    USER_ROLES.OWNER,
    USER_ROLES.ADMIN,
    USER_ROLES.FINANCE,
    USER_ROLES.OPS,
  ]);

  return <PaymentView />;
}
