import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { getDeliveryMonitoringService } from '@/modules/monitoring/services/delivery-monitoring.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/monitoring/delivery?date=YYYY-MM-DD&teamId=...&search=...
 * Allowed roles: OWNER, ADMIN, OPS, FINANCE.
 * Forbidden: DRIVER.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.OPS,
      USER_ROLES.FINANCE,
    ]);

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || undefined;
    const teamId = searchParams.get('teamId') || undefined;
    const search = searchParams.get('search') || undefined;

    const result = await getDeliveryMonitoringService({ date, teamId, search });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/monitoring/delivery Error:', error);
    return NextResponse.json(
      { success: false, error: 'Data monitoring delivery gagal dimuat. Silakan coba kembali.' },
      { status: 500 }
    );
  }
}
