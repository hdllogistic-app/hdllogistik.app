import { NextRequest, NextResponse } from 'next/server';
import { requireRole, verifyCurrentUser } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { validateSameOrigin } from '@/lib/auth/csrf';
import {
  getWorkLocationsService,
  createWorkLocationService,
} from '@/modules/attendance/services/work-location.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireRole([USER_ROLES.OWNER, USER_ROLES.ADMIN, USER_ROLES.FINANCE]);

    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get('active') === 'true';

    const result = await getWorkLocationsService(onlyActive);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/finance/attendance/locations Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data lokasi absensi.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!validateSameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'Bad Request' }, { status: 400 });
  }

  const user = await verifyCurrentUser();
  if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN' && user.role !== 'FINANCE')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = await createWorkLocationService(body, user.userId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/finance/attendance/locations Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menambahkan lokasi absensi baru.' },
      { status: 500 }
    );
  }
}
