import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { getDriverDeliveriesService } from '@/modules/delivery/services/driver-delivery.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Strict DAL Check: Must be authenticated user with DRIVER role
    const currentUser = await requireRole([USER_ROLES.DRIVER]);

    // 2. Strict Data Isolation: employeeId is derived ONLY from verified session
    const driverEmployeeId = currentUser.employeeId;
    if (!driverEmployeeId) {
      return NextResponse.json(
        { success: false, error: 'Akun ini tidak terhubung dengan data Driver.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date') || undefined;
    const filterParam = (searchParams.get('filter') || 'all').toLowerCase() as 'all' | 'success' | 'pending';

    const result = await getDriverDeliveriesService(
      driverEmployeeId,
      dateParam,
      filterParam
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      driverName: currentUser.employeeName,
      selectedDate: result.selectedDate,
      summary: result.summary,
      deliveries: result.deliveries,
    });
  } catch (error) {
    console.error('GET /api/driver/deliveries Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil daftar penugasan delivery.' },
      { status: 500 }
    );
  }
}
