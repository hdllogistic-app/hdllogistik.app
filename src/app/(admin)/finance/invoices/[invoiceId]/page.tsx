import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { InvoiceDetailView } from './InvoiceDetailView';

export const metadata = {
  title: 'Detail Invoice | HDL LOGISTIK',
  description: 'Rincian invoice penagihan dan histori pembayaran.',
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  await requireRole([
    USER_ROLES.OWNER,
    USER_ROLES.ADMIN,
    USER_ROLES.FINANCE,
    USER_ROLES.OPS,
  ]);

  const { invoiceId } = await params;
  return <InvoiceDetailView invoiceId={invoiceId} />;
}
