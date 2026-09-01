import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { SalaryClosingView } from './SalaryClosingView';

export const metadata = {
  title: 'Salary Closing | HDL LOGISTIK',
  description: 'Tutup periode gaji team dan buat slip salary.',
};

export default async function SalaryClosingPage() {
  await requireRole([
    USER_ROLES.OWNER,
    USER_ROLES.ADMIN,
    USER_ROLES.FINANCE,
  ]);

  return <SalaryClosingView />;
}
