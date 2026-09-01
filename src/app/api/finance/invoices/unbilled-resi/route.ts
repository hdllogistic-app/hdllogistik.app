import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { getUnbilledResiService } from '@/modules/invoice/services/invoice.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.FINANCE,
      USER_ROLES.OPS,
    ]);

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const customerId = searchParams.get('customerId') || undefined;
    const searchQuery = searchParams.get('searchQuery') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;

    const result = await getUnbilledResiService({
      startDate,
      endDate,
      customerId,
      searchQuery,
      page,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/finance/invoices/unbilled-resi Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data resi unbilled.' },
      { status: 500 }
    );
  }
}
