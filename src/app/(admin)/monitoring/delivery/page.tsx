import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { DeliveryMonitoringView } from './DeliveryMonitoringView';

export const metadata = {
  title: 'Delivery Monitoring | HDL LOGISTIK',
  description: 'Pantau progress delivery dan TTD berdasarkan team.',
};

export default async function DeliveryMonitoringPage() {
  await requireRole([
    USER_ROLES.OWNER,
    USER_ROLES.ADMIN,
    USER_ROLES.OPS,
    USER_ROLES.FINANCE,
  ]);

  return <DeliveryMonitoringView />;
}
