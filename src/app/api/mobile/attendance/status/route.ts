import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { getTodayAttendanceStatusService } from '@/modules/attendance/services/mobile-attendance.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireRole([USER_ROLES.DRIVER, USER_ROLES.HELPER]);
    const employeeId = currentUser.employeeId;

    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'Unauthenticated employee.' }, { status: 403 });
    }

    const result = await getTodayAttendanceStatusService(employeeId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/mobile/attendance/status Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil status absensi.' },
      { status: 500 }
    );
  }
}
