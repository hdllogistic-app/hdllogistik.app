import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { validateSameOrigin } from '@/lib/auth/csrf';
import { clockOutMobileService } from '@/modules/attendance/services/mobile-attendance.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!validateSameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'Bad Request' }, { status: 400 });
  }

  // 1. Authenticate user: Must be DRIVER or HELPER
  const currentUser = await requireRole([USER_ROLES.DRIVER, USER_ROLES.HELPER]);

  // 2. Derive employeeId strictly from session
  const employeeId = currentUser.employeeId;
  if (!employeeId) {
    return NextResponse.json(
      { success: false, error: 'Akun Anda tidak terhubung dengan data Employee.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { latitude, longitude, photoUrl } = body || {};

    const result = await clockOutMobileService(
      employeeId,
      Number(latitude),
      Number(longitude),
      photoUrl ? String(photoUrl) : undefined
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/mobile/attendance/clock-out Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memproses Absen Pulang.' },
      { status: 500 }
    );
  }
}
