import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { validateSameOrigin } from '@/lib/auth/csrf';
import { assignResiToDriverService } from '@/modules/delivery/services/driver-scan-assignment.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!validateSameOrigin(request)) {
    return NextResponse.json({ success: false, error: 'Bad Request' }, { status: 400 });
  }

  // 1. Authenticate user: Must be DRIVER
  const currentUser = await requireRole([USER_ROLES.DRIVER]);

  // 2. Derive employeeId & userId strictly from verified session
  const driverEmployeeId = currentUser.employeeId;
  const userId = currentUser.userId;

  if (!driverEmployeeId) {
    return NextResponse.json(
      { success: false, error: 'Akun Anda tidak terhubung dengan data Driver.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { resiNumber } = body || {};

    const result = await assignResiToDriverService(
      driverEmployeeId,
      userId,
      String(resiNumber || '')
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/driver/scan/assign Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menjadwalkan paket.' },
      { status: 500 }
    );
  }
}
