import { NextRequest, NextResponse } from 'next/server';
import { requireRole, verifyCurrentUser } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { validateSameOrigin } from '@/lib/auth/csrf';
import {
  getOperationalExpensesService,
  createOperationalExpenseService,
} from '@/modules/finance/services/operational-settlement.service';

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
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const result = await getOperationalExpensesService({
      startDate,
      endDate,
      category,
      status,
      search,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/finance/operational-settlement Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data operasional.' },
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
    const result = await createOperationalExpenseService(body, user.userId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: (result as any).error || 'Gagal menyimpan data.' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/finance/operational-settlement Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menyimpan operasional.' },
      { status: 500 }
    );
  }
}
