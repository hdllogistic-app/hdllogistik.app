import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { getAttendanceService } from '@/modules/finance/services/attendance.service';

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
    const division = searchParams.get('division') || undefined;
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;

    const result = await getAttendanceService({
      startDate,
      endDate,
      division,
      search,
      status,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/finance/attendance Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data absensi.' },
      { status: 500 }
    );
  }
}
