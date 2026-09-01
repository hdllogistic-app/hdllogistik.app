import { NextRequest, NextResponse } from 'next/server';
import { requireRole, verifyCurrentUser } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { validateSameOrigin } from '@/lib/auth/csrf';
import {
  getAccountsService,
  createAccountService,
} from '@/modules/settings/services/account.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireRole([USER_ROLES.OWNER, USER_ROLES.ADMIN]);

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('searchQuery') || undefined;
    const statusFilter = (searchParams.get('statusFilter') as any) || undefined;
    const roleFilter = (searchParams.get('roleFilter') as any) || undefined;

    const result = await getAccountsService({ searchQuery, statusFilter, roleFilter });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/settings/accounts Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data akun team.' },
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

  if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = await createAccountService(body, user.role, user.userId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/settings/accounts Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal membuat akun login baru.' },
      { status: 500 }
    );
  }
}
