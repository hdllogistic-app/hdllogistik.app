import { NextRequest, NextResponse } from 'next/server';
import { requireRole, verifyCurrentUser } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { validateSameOrigin } from '@/lib/auth/csrf';
import {
  getInvoiceListService,
  createInvoiceService,
} from '@/modules/invoice/services/invoice.service';

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
    const statusFilter = (searchParams.get('statusFilter') as any) || undefined;
    const customerId = searchParams.get('customerId') || undefined;
    const searchQuery = searchParams.get('searchQuery') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;

    const result = await getInvoiceListService({
      startDate,
      endDate,
      statusFilter,
      customerId,
      searchQuery,
      page,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/finance/invoices Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil daftar invoice.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!validateSameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'Bad Request' }, { status: 400 });
  }

  const user = await verifyCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
  }

  if (user.role === 'OPS' || user.role === 'DRIVER') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = await createInvoiceService(body, user.userId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/finance/invoices Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal membuat invoice penagihan.' },
      { status: 500 }
    );
  }
}
