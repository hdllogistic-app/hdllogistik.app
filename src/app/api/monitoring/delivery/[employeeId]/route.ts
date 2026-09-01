import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { getDetailDeliveryMonitoringService } from '@/modules/monitoring/services/delivery-monitoring.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/monitoring/delivery/[employeeId]?date=YYYY-MM-DD&status=ALL|TTD|PENDING&page=1
 * Allowed roles: OWNER, ADMIN, OPS, FINANCE.
 * Forbidden: DRIVER.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    await requireRole([
      USER_ROLES.OWNER,
      USER_ROLES.ADMIN,
      USER_ROLES.OPS,
      USER_ROLES.FINANCE,
    ]);

    const { employeeId } = await params;
    const { searchParams } = new URL(request.url);

    const date = searchParams.get('date') || undefined;
    const statusParam = searchParams.get('status') || 'ALL';
    const page = Number(searchParams.get('page')) || 1;

    const statusFilter = (['ALL', 'TTD', 'PENDING'].includes(statusParam)
      ? statusParam
      : 'ALL') as 'ALL' | 'TTD' | 'PENDING';

    const result = await getDetailDeliveryMonitoringService(
      employeeId,
      date,
      statusFilter,
      page,
      25
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/monitoring/delivery/[employeeId] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Detail data delivery gagal dimuat.' },
      { status: 500 }
    );
  }
}
