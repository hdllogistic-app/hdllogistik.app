import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/dal';
import { USER_ROLES } from '@/lib/auth/roles';
import { lookupResiForScanService } from '@/modules/delivery/services/driver-scan-assignment.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireRole([USER_ROLES.DRIVER]);
    const driverEmployeeId = currentUser.employeeId;

    if (!driverEmployeeId) {
      return NextResponse.json(
        { success: false, error: 'Akun ini tidak terhubung dengan data Driver.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const resiParam = searchParams.get('resi') || '';

    const result = await lookupResiForScanService(driverEmployeeId, resiParam);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/driver/scan/lookup Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal melakukan pencarian resi.' },
      { status: 500 }
    );
  }
}
