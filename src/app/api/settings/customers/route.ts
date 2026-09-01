import { NextRequest, NextResponse } from 'next/server';
import { requireRole, verifyCurrentUser } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { validateSameOrigin } from '@/lib/auth/csrf';
import {
  getCustomersService,
  createCustomerService,
} from '@/modules/settings/services/customer.service';

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
    const searchQuery = searchParams.get('searchQuery') || undefined;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const result = await getCustomersService({ searchQuery, activeOnly });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/settings/customers Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data master customer.' },
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

  if (user.role === 'DRIVER') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = await createCustomerService(body, user.userId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/settings/customers Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal membuat customer baru.' },
      { status: 500 }
    );
  }
}
