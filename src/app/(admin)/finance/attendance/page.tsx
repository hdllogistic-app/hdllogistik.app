import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { AttendanceView } from './AttendanceView';

export const metadata = {
  title: 'Absensi Team | HDL LOGISTIK',
  description: 'Pantau kehadiran team dan estimasi penghasilan berdasarkan absensi.',
};

export default async function AttendancePage() {
  await requireRole([
    USER_ROLES.OWNER,
    USER_ROLES.ADMIN,
    USER_ROLES.FINANCE,
    USER_ROLES.OPS,
  ]);

  return <AttendanceView />;
}
